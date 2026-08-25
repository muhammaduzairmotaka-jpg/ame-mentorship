"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

const links = [
  { href: "/mentee", label: "Dashboard" },
  { href: "/mentee/book", label: "Book 1:1 Session" },
  { href: "/mentee/mentors", label: "Find a Mentor" },
];

export default function BookSessionPage() {
  const supabase = createClient();
  const [mentors, setMentors] = useState<any[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mentor_public_profiles").select("*");
      setMentors(data ?? []);
      setLoading(false);
    })();
  }, []);

  async function loadSessions(mentorId: string) {
    setSelectedMentor(mentorId);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("mentor_id", mentorId)
      .gte("session_date", today)
      .in("status", ["available", "booked", "full"])
      .order("session_date")
      .order("start_time");
    setSessions(data ?? []);
  }

  async function handleBook(session: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isFull = session.booked_count >= session.capacity;

    const { error } = await supabase.from("bookings").insert({
      session_id: session.id,
      mentee_id: user.id,
      status: isFull ? "waiting_list" : "booked",
      is_waiting_list: isFull,
      waiting_list_position: isFull ? session.booked_count - session.capacity + 1 : null,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus(isFull ? "Session was full — you've been added to the waiting list." : "Booked! Check your dashboard for confirmation.");
      loadSessions(selectedMentor);
    }
  }

  return (
    <AppShell role="mentee" links={links}>
      <h1 className="text-xl font-semibold mb-4 text-ink">Book a Session</h1>

      {status && <p className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">{status}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <h2 className="font-medium mb-3 text-ink">Mentors</h2>
          {loading ? <p className="text-sm text-ink-muted">Loading...</p> : (
            <div className="space-y-2">
              {mentors.map((m) => (
                <button key={m.id} onClick={() => loadSessions(m.id)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm ${selectedMentor === m.id ? "border-accent bg-accent-soft" : "border-cream-border bg-white hover:bg-cream"}`}>
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-xs text-ink-muted">{m.company} · {m.years_experience ?? "—"} yrs</p>
                  {m.specialties?.length > 0 && (
                    <p className="text-xs text-ink-muted mt-1">{m.specialties.join(", ")}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2">
          <h2 className="font-medium mb-3 text-ink">Available slots</h2>
          {!selectedMentor && <p className="text-sm text-ink-muted">Select a mentor to see availability.</p>}
          {selectedMentor && !sessions.length && <p className="text-sm text-ink-muted">No upcoming slots. Check back soon.</p>}
          <div className="space-y-2">
            {sessions.map((s) => {
              const isFull = s.booked_count >= s.capacity;
              return (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-lg border border-cream-border px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.session_date} · {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>
                    <p className="text-xs text-ink-muted">
                      {s.session_type} · {s.location ?? "TBD"} · {s.booked_count}/{s.capacity} booked
                    </p>
                  </div>
                  <button onClick={() => handleBook(s)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${isFull ? "bg-warn-soft0 hover:bg-amber-600" : "bg-accent hover:bg-accent-hover"}`}>
                    {isFull ? "Join waiting list" : "Book"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
