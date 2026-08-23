"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type DaySession = {
  id: string;
  session_date: string;
  capacity: number;
  booked_count: number;
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

export default function TrainingCalendar({
  mentorId,
  canEdit,
  canSignup,
  currentUserId,
}: {
  mentorId: string;
  canEdit: boolean;
  canSignup: boolean;
  currentUserId?: string;
}) {
  const supabase = createClient();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sessions, setSessions] = useState<Record<string, DaySession>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myBookingId, setMyBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkDates, setBulkDates] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;

    const { data } = await supabase
      .from("sessions")
      .select("id, session_date, capacity, booked_count")
      .eq("mentor_id", mentorId)
      .gte("session_date", start)
      .lte("session_date", end);

    const map: Record<string, DaySession> = {};
    (data ?? []).forEach((s) => { map[s.session_date] = s; });
    setSessions(map);
    setLoading(false);
  }, [mentorId, month, year, supabase]);

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
    const s = sessions[dateStr];
    if (s) await loadBookings(s.id);
    else { setBookings([]); setMyBookingId(null); }
  }

  async function markAvailable(dateStr: string) {
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

  async function removeAvailability(sessionId: string, dateStr: string) {
    await supabase.from("sessions").delete().eq("id", sessionId);
    await loadMonth();
    setSelectedDate(null);
  }

  async function bulkAdd() {
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
    const s = selectedDate ? sessions[selectedDate] : null;
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-sm">{monthName} {year}</p>
        <div className="flex gap-1">
          <button onClick={() => { const m = month - 1; if (m < 0) { setMonth(11); setYear(year - 1); } else setMonth(m); setSelectedDate(null); }}
            className="rounded border border-slate-300 px-2 py-0.5 text-sm">‹</button>
          <button onClick={() => { const m = month + 1; if (m > 11) { setMonth(0); setYear(year + 1); } else setMonth(m); setSelectedDate(null); }}
            className="rounded border border-slate-300 px-2 py-0.5 text-sm">›</button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-3">Max {DEFAULT_CAPACITY}/day, first come first served</p>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="grid grid-cols-7 gap-1 mb-3">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <div key={d} className="text-center text-[10px] text-slate-400">{d}</div>
          ))}
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const s = sessions[dateStr];
            const isFull = s && s.booked_count >= s.capacity;
            const isToday = dateStr === todayStr;
            const isSel = dateStr === selectedDate;
            let bg = "bg-slate-50 text-slate-400 border-slate-200";
            if (s && !isFull) bg = "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium";
            if (s && isFull) bg = "bg-amber-50 text-amber-800 border-amber-300 font-medium";
            return (
              <button key={dateStr} onClick={() => selectDate(dateStr)}
                className={`aspect-square rounded-md border text-xs relative ${bg} ${isToday ? "ring-2 ring-blue-400" : ""} ${isSel ? "border-2 border-blue-500" : ""}`}>
                {Number(dateStr.slice(-2))}
                {s && <span className="absolute bottom-0.5 right-1 text-[8px]">{s.booked_count}/{s.capacity}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 text-[11px] text-slate-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-300 inline-block" /> Open</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-300 inline-block" /> Full</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-50 border border-slate-200 inline-block" /> Not available</span>
      </div>

      {msg && <p className="text-sm text-blue-700 bg-blue-50 rounded-md px-3 py-1.5 mb-3">{msg}</p>}

      {selectedDate && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-sm font-medium mb-2">{selectedDate}</p>
          {!sessions[selectedDate] ? (
            <>
              <p className="text-sm text-slate-500 mb-2">Not marked available.</p>
              {canEdit && (
                <button onClick={() => markAvailable(selectedDate)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  Mark as available (cap {DEFAULT_CAPACITY})
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-2">{bookings.length}/{sessions[selectedDate].capacity} spots filled</p>
              {bookings.length ? bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                  <span>{b.full_name}</span>
                  {canEdit && (
                    <button onClick={() => removeBooking(b.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                  )}
                </div>
              )) : <p className="text-sm text-slate-500">No sign-ups yet.</p>}

              {canSignup && (
                <button onClick={signUp} disabled={!!myBookingId || bookings.length >= sessions[selectedDate].capacity}
                  className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {myBookingId ? "You're signed up" : bookings.length >= sessions[selectedDate].capacity ? "Full — no spots left" : "Sign up for this day"}
                </button>
              )}

              {canEdit && (
                <button onClick={() => removeAvailability(sessions[selectedDate].id, selectedDate)}
                  className="mt-3 ml-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                  Remove this date&apos;s availability
                </button>
              )}
            </>
          )}
        </div>
      )}

      {canEdit && (
        <div className="border-t border-slate-100 pt-3 mt-3">
          <p className="text-sm font-medium mb-1">Bulk-add available days</p>
          <p className="text-xs text-slate-500 mb-2">Paste one date per line (YYYY-MM-DD) — handy for loading a shift schedule all at once.</p>
          <textarea value={bulkDates} onChange={(e) => setBulkDates(e.target.value)} rows={3}
            placeholder={"2026-08-10\n2026-08-11\n2026-08-12"}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono mb-2" />
          <button onClick={bulkAdd} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
            Add all dates
          </button>
        </div>
      )}
    </div>
  );
}
