import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { redirect } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mentees", label: "Mentees" },
  { href: "/admin/training-calendar", label: "Training Calendar" },
];

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [{ count: mentorCount }, { count: menteeCount }, { count: weekAppts },
         { count: completed }, { count: cancellations }, { count: noShows },
         { count: followUps }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "mentor").eq("is_active", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "mentee").eq("is_active", true),
    supabase.from("sessions").select("*", { count: "exact", head: true }).gte("session_date", today).lte("session_date", weekAhead),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).like("status", "cancelled%"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "no_show"),
    supabase.from("mentee_details").select("*", { count: "exact", head: true }).eq("requires_follow_up", true),
  ]);

  return (
    <AppShell role="admin" links={links}>
      <h1 className="text-2xl font-semibold mb-6 text-ink">Organization Overview</h1>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Active mentors" value={mentorCount} />
        <Stat label="Active mentees" value={menteeCount} />
        <Stat label="Sessions this week" value={weekAppts} />
        <Stat label="Completed appointments" value={completed} />
        <Stat label="Cancellations" value={cancellations} />
        <Stat label="No-shows" value={noShows} />
        <Stat label="Mentees needing follow-up" value={followUps} highlight />
      </div>
    </AppShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | null; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-warn bg-warn-soft" : "border-cream-border bg-cream-card"}`}>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-2xl font-semibold text-ink">{value ?? 0}</p>
    </div>
  );
}
