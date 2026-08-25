import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { redirect } from "next/navigation";

const links = [
  { href: "/mentor", label: "Dashboard" },
  { href: "/mentor/availability", label: "1:1 Availability" },
  { href: "/mentor/training-days", label: "Training Days" },
  { href: "/mentor/mentees", label: "My Mentees" },
  { href: "/calendar", label: "Org Calendar" },
];

export default async function MentorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const { data: todaySessions } = await supabase
    .from("sessions")
    .select("id, start_time, end_time, status, capacity, booked_count")
    .eq("mentor_id", user.id)
    .eq("session_date", today)
    .order("start_time");

  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, session_date, start_time, status, capacity, booked_count")
    .eq("mentor_id", user.id)
    .gt("session_date", today)
    .order("session_date")
    .limit(10);

  const { data: assignedMentees } = await supabase
    .from("mentee_details")
    .select("profile_id, profiles!mentee_details_profile_id_fkey(full_name)")
    .eq("assigned_mentor_id", user.id);

  return (
    <AppShell role="mentor" links={links}>
      <h1 className="text-xl font-semibold mb-4 text-ink">Mentor Dashboard</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Today's sessions" value={todaySessions?.length ?? 0} />
        <StatCard label="Upcoming (next 28d)" value={upcoming?.length ?? 0} />
        <StatCard label="Assigned mentees" value={assignedMentees?.length ?? 0} />
      </div>

      <section className="mb-6">
        <h2 className="font-medium mb-3 text-ink">Today</h2>
        <SessionTable sessions={todaySessions ?? []} />
      </section>

      <section>
        <h2 className="font-medium mb-3 text-ink">Upcoming</h2>
        <SessionTable sessions={upcoming ?? []} showDate />
      </section>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-cream-border bg-cream-card p-3.5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function SessionTable({ sessions, showDate }: { sessions: any[]; showDate?: boolean }) {
  if (!sessions.length) return <p className="text-sm text-ink-muted">No sessions.</p>;
  return (
    <table className="w-full text-sm bg-white rounded-lg border border-cream-border overflow-hidden">
      <thead className="bg-cream-card text-left">
        <tr>
          {showDate && <th className="px-3 py-2">Date</th>}
          <th className="px-3 py-2">Time</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Capacity</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.id} className="border-t border-cream-border">
            {showDate && <td className="px-3 py-2">{s.session_date}</td>}
            <td className="px-3 py-2">{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</td>
            <td className="px-3 py-2 capitalize">{s.status.replace(/_/g, " ")}</td>
            <td className="px-3 py-2">{s.booked_count}/{s.capacity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
