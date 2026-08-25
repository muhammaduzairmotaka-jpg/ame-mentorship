import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import CancelBookingButton from "@/components/CancelBookingButton";
import Link from "next/link";
import { redirect } from "next/navigation";

const links = [
  { href: "/mentee", label: "Dashboard" },
  { href: "/mentee/book", label: "Book 1:1 Session" },
  { href: "/mentee/mentors", label: "Find a Mentor" },
  { href: "/calendar", label: "Org Calendar" },
];

export default async function MenteeDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mentee } = await supabase
    .from("mentee_details")
    .select("assigned_mentor_id, employment_status, requires_follow_up")
    .eq("profile_id", user.id)
    .single();

  let mentorName: string | null = null;
  if (mentee?.assigned_mentor_id) {
    const { data: mentor } = await supabase
      .from("profiles").select("full_name").eq("id", mentee.assigned_mentor_id).single();
    mentorName = mentor?.full_name ?? null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select("id, status, sessions(session_date, start_time, mentor_id, profiles!sessions_mentor_id_fkey(full_name))")
    .eq("mentee_id", user.id)
    .in("status", ["booked", "waiting_list"]);

  const { data: visibleAssessments } = await supabase
    .from("assessments")
    .select("rating, written_feedback, assessed_at, development_categories(name)")
    .eq("mentee_id", user.id)
    .eq("visible_to_mentee", true)
    .order("assessed_at", { ascending: false })
    .limit(5);

  return (
    <AppShell role="mentee" links={links}>
      <h1 className="text-xl font-semibold mb-4 text-ink">My Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg border border-cream-border bg-cream-card p-3.5">
          <p className="text-xs text-ink-muted">Assigned mentor</p>
          <p className="text-lg font-semibold text-ink">{mentorName ?? "Not yet assigned"}</p>
        </div>
        <div className="rounded-lg border border-cream-border bg-cream-card p-3.5">
          <p className="text-xs text-ink-muted">Employment status</p>
          <p className="text-lg font-semibold capitalize text-ink">{mentee?.employment_status?.replace(/_/g, " ") ?? "—"}</p>
        </div>
      </div>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-ink">Upcoming appointments</h2>
          <Link href="/mentee/book" className="text-sm text-accent">Book a session →</Link>
        </div>
        {upcomingBookings?.length ? (
          <ul className="space-y-2">
            {upcomingBookings.map((b: any) => (
              <li key={b.id} className="bg-white rounded-lg border border-cream-border px-4 py-3 text-sm flex items-center justify-between gap-3">
                <span>{b.sessions?.session_date} at {b.sessions?.start_time?.slice(0,5)} with {b.sessions?.profiles?.full_name}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="capitalize text-ink-muted">{b.status.replace(/_/g," ")}</span>
                  <CancelBookingButton bookingId={b.id} />
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No upcoming appointments.</p>}
      </section>

      <section>
        <h2 className="font-medium mb-3 text-ink">Recent feedback</h2>
        {visibleAssessments?.length ? (
          <ul className="space-y-2">
            {visibleAssessments.map((a: any, i: number) => (
              <li key={i} className="bg-white rounded-lg border border-cream-border px-4 py-3 text-sm">
                <p className="font-medium">{a.development_categories?.name} — <span className="capitalize">{a.rating.replace(/_/g," ")}</span></p>
                {a.written_feedback && <p className="text-ink-muted mt-1">{a.written_feedback}</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No feedback shared yet.</p>}
      </section>
    </AppShell>
  );
}
