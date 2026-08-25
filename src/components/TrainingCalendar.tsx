"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type DaySession = {
  id: string;
  session_date: string;
  capacity: number;
  booked_count: number;
  mentor_id: string;
};

type Booking = {
  id: string;
  mentee_id: string;
  full_name: string;
};

const DEFAULT_CAPACITY = 5;
// Full-day training slot — stored as a single session row per date.
const DAY_START = "09:00:00";
const DAY_END = "17:00:00";

// A small, readable palette for telling mentors apart on a shared calendar.
const MENTOR_COLORS = [
  { dot: "#2f6fed", ring: "#a9c6fb" }, // blue
  { dot: "#c2410c", ring: "#fdba8c" }, // burnt orange
  { dot: "#0f766e", ring: "#99e6dd" }, // teal
  { dot: "#a21caf", ring: "#eab8f0" }, // magenta
  { dot: "#b5842a", ring: "#f0d9a6" }, // amber
  { dot: "#4338ca", ring: "#c3bffb" }, // indigo
];

export function colorForMentor(mentorId: string, mentorIds: string[]) {
  const idx = Math.max(0, mentorIds.indexOf(mentorId));
  return MENTOR_COLORS[idx % MENTOR_COLORS.length];
}

export default function TrainingCalendar({
  mentorId,
  mentors,
  canEdit,
  canSignup,
  currentUserId,
}: {
  // Single-mentor mode: pass mentorId (mentor's own calendar, or a mentee
  // viewing one specific mentor's days).
  mentorId?: string;
  // Multi-mentor mode: pass the list of mentors to see everyone's training
  // days on one calendar, colour-coded by mentor (used on the admin view).
  mentors?: { id: string; full_name: string }[];
  canEdit: boolean;
  canSignup: boolean;
  currentUserId?: string;
}) {
  const supabase = createClient();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sessions, setSessions] = useState<Record<string, DaySession[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myBookingId, setMyBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkDates, setBulkDates] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const multiMode = !!mentors?.length;
  const mentorIds = useMemo(
    () => (multiMode ? mentors!.map((m) => m.id) : mentorId ? [mentorId] : []),
    [multiMode, mentors, mentorId]
  );
  const mentorNameById = useMemo(() => {
    const map: Record<string, string> = {};
    mentors?.forEach((m) => { map[m.id] = m.full_name; });
    return map;
  }, [mentors]);

  const loadMonth = useCallback(async () => {
    if (!mentorIds.length) { setSessions({}); setLoading(false); return; }
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;

    const { data } = await supabase
      .from("sessions")
      .select("id, session_date, capacity, booked_count, mentor_id")
      .in("mentor_id", mentorIds)
      .gte("session_date", start)
      .lte("session_date", end);

    const map: Record<string, DaySession[]> = {};
    (data ?? []).forEach((s) => {
      if (!map[s.session_date]) map[s.session_date] = [];
      map[s.session_date].push(s);
    });
    setSessions(map);
    setLoading(false);
  }, [mentorIds, month, year, supabase]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  async function loadBookings(sessionId: string) {
    const { data } = await supabase
      .from("bookings")
      .select("id, mentee_id, status, profiles!bookings_mentee_id_fkey(full_name)")
      .eq("session_id", sessionId)
      .eq("status", "booked");

    const rows: Booking[] = (data ?? []).map((b: any) => ({
      id: b.id, mentee_id: b.mentee_id, full_name: b.profiles?.full_name ?? "Unknown",
    }));
    setBookings(rows);
    setMyBookingId(rows.find((r) => r.mentee_id === currentUserId)?.id ?? null);
  }

  async function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setMsg(null);
    const daySessions = sessions[dateStr];
    const s = daySessions?.[0];
    if (s) await loadBookings(s.id);
    else { setBookings([]); setMyBookingId(null); }
  }

  async function markAvailable(dateStr: string) {
    if (!mentorId) return;
    const { error } = await supabase.from("sessions").insert({
      mentor_id: mentorId,
      session_date: dateStr,
      start_time: DAY_START,
      end_time: DAY_END,
      session_type: "group",
      capacity: DEFAULT_CAPACITY,
      status: "available",
    });
    if (error) setMsg(`Error: ${error.message}`);
    await loadMonth();
    await selectDate(dateStr);
  }

  async function removeAvailability(sessionId: string) {
    await supabase.from("sessions").delete().eq("id", sessionId);
    await loadMonth();
    setSelectedDate(null);
  }

  async function bulkAdd() {
    if (!mentorId) return;
    const dates = bulkDates
      .split(/[\n,]/)
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

    if (!dates.length) { setMsg("No valid dates found. Use one YYYY-MM-DD date per line."); return; }

    const rows = dates.map((d) => ({
      mentor_id: mentorId,
      session_date: d,
      start_time: DAY_START,
      end_time: DAY_END,
      session_type: "group",
      capacity: DEFAULT_CAPACITY,
      status: "available",
    }));

    const { error } = await supabase.from("sessions").upsert(rows, { onConflict: "mentor_id,session_date,start_time" });
    setMsg(error ? `Error: ${error.message}` : `Added ${dates.length} day(s).`);
    setBulkDates("");
    await loadMonth();
  }

  async function removeBooking(bookingId: string) {
    await supabase.from("bookings").update({ status: "cancelled_by_mentor", cancelled_at: new Date().toISOString() }).eq("id", bookingId);
    if (selectedDate) await selectDate(selectedDate);
    await loadMonth();
  }

  async function signUp() {
    const daySessions = selectedDate ? sessions[selectedDate] : null;
    const s = daySessions?.[0];
    if (!s || !currentUserId) return;
    const { error } = await supabase.from("bookings").insert({
      session_id: s.id, mentee_id: currentUserId, status: "booked",
    });
    if (error) {
      setMsg(error.message.includes("capacity") ? "This day is full." : `Error: ${error.message}`);
    } else {
      setMsg("You're signed up!");
    }
    await loadMonth();
    if (selectedDate) await selectDate(selectedDate);
  }

  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = first.toLocaleString("default", { month: "long" });
  const todayStr = today.toISOString().slice(0, 10);

  const cells: (string | null)[] = [...Array(startDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const selectedSessions = selectedDate ? sessions[selectedDate] ?? [] : [];
  const selectedSession = selectedSessions[0];

  return (
    <div className="rounded-xl border border-cream-border bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-sm text-ink">{monthName} {year}</p>
        <div className="flex gap-1">
          <button onClick={() => { const m = month - 1; if (m < 0) { setMonth(11); setYear(year - 1); } else setMonth(m); setSelectedDate(null); }}
            className="rounded border border-cream-border px-2 py-0.5 text-sm text-ink">‹</button>
          <button onClick={() => { const m = month + 1; if (m > 11) { setMonth(0); setYear(year + 1); } else setMonth(m); setSelectedDate(null); }}
            className="rounded border border-cream-border px-2 py-0.5 text-sm text-ink">›</button>
        </div>
      </div>
      {!multiMode && <p className="text-xs text-ink-muted mb-3">Max {DEFAULT_CAPACITY}/day, first come first served</p>}
      {multiMode && <p className="text-xs text-ink-muted mb-3">Dot colour shows which mentor is running that day</p>}

      {loading ? <p className="text-sm text-ink-muted">Loading...</p> : (
        <div className="grid grid-cols-7 gap-1 mb-3">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="text-center text-[10px] text-ink-muted">{d}</div>
          ))}
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const daySessions = sessions[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isSel = dateStr === selectedDate;
            return (
              <button key={dateStr} onClick={() => selectDate(dateStr)}
                className={`aspect-square rounded-md border text-xs relative bg-cream-card border-cream-border text-ink flex flex-col items-center justify-center gap-1 ${isToday ? "ring-2 ring-accent-border" : ""} ${isSel ? "!border-2 !border-accent" : ""}`}>
                <span>{Number(dateStr.slice(-2))}</span>
                {daySessions.length > 0 && (
                  <span className="flex gap-0.5">
                    {daySessions.slice(0, 4).map((s) => (
                      <span key={s.id} className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: colorForMentor(s.mentor_id, mentorIds).dot }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {multiMode && mentors && mentors.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted mb-3">
          {mentors.map((m) => (
            <span key={m.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorForMentor(m.id, mentorIds).dot }} />
              {m.full_name}
            </span>
          ))}
        </div>
      )}

      {msg && <p className="text-sm text-accent bg-accent-soft rounded-md px-3 py-1.5 mb-3">{msg}</p>}

      {selectedDate && (
        <div className="border-t border-cream-border pt-3">
          <p className="text-sm font-medium mb-2 text-ink">{selectedDate}</p>

          {!selectedSessions.length ? (
            <>
              <p className="text-sm text-ink-muted mb-2">Not marked available.</p>
              {canEdit && mentorId && (
                <button onClick={() => markAvailable(selectedDate)}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover">
                  Mark as available (cap {DEFAULT_CAPACITY})
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {selectedSessions.map((s) => (
                <div key={s.id}>
                  {multiMode && (
                    <p className="text-xs font-medium mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorForMentor(s.mentor_id, mentorIds).dot }} />
                      {mentorNameById[s.mentor_id] ?? "Mentor"}
                    </p>
                  )}
                  <p className="text-xs text-ink-muted mb-2">{bookings.length}/{s.capacity} spots filled</p>
                  {bookings.length ? bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm py-1 border-b border-cream-border last:border-0">
                      <span className="text-ink">{b.full_name}</span>
                      {canEdit && (
                        <button onClick={() => removeBooking(b.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                      )}
                    </div>
                  )) : <p className="text-sm text-ink-muted">No sign-ups yet.</p>}

                  {canSignup && (
                    <button onClick={signUp} disabled={!!myBookingId || bookings.length >= s.capacity}
                      className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50">
                      {myBookingId ? "You're signed up" : bookings.length >= s.capacity ? "Full — no spots left" : "Sign up for this day"}
                    </button>
                  )}

                  {canEdit && (
                    <button onClick={() => removeAvailability(s.id)}
                      className="mt-3 ml-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                      Remove this date&apos;s availability
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canEdit && mentorId && (
        <div className="border-t border-cream-border pt-3 mt-3">
          <p className="text-sm font-medium mb-1 text-ink">Bulk-add available days</p>
          <p className="text-xs text-ink-muted mb-2">Paste one date per line (YYYY-MM-DD) — handy for loading a shift schedule all at once.</p>
          <textarea value={bulkDates} onChange={(e) => setBulkDates(e.target.value)} rows={3}
            placeholder={"2026-08-10\n2026-08-11\n2026-08-12"}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-xs font-mono mb-2" />
          <button onClick={bulkAdd} className="rounded-md border border-cream-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-card">
            Add all dates
          </button>
        </div>
      )}
    </div>
  );
}
