"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import TrainingCalendar from "@/components/TrainingCalendar";

// A read-only, org-wide calendar every role can see — every mentor's
// training days on one calendar, colour-coded by mentor. Mentees can't
// book from here (they book from Find a Mentor), this is just visibility.
export default function OrgCalendarPage() {
  const supabase = createClient();
  const [role, setRole] = useState<"admin" | "mentor" | "mentee" | null>(null);
  const [mentors, setMentors] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setRole((profile?.role as any) ?? null);
      }
      const { data } = await supabase.from("mentor_public_profiles").select("id, full_name");
      setMentors(data ?? []);
      setLoading(false);
    })();
  }, []);

  const links =
    role === "admin"
      ? [
          { href: "/admin", label: "Overview" },
          { href: "/admin/mentees", label: "Mentees" },
          { href: "/admin/training-calendar", label: "Training Calendar" },
          { href: "/admin/records", label: "Records" },
          { href: "/calendar", label: "Org Calendar" },
        ]
      : role === "mentor"
      ? [
          { href: "/mentor", label: "Dashboard" },
          { href: "/mentor/availability", label: "1:1 Availability" },
          { href: "/mentor/training-days", label: "Training Days" },
          { href: "/mentor/mentees", label: "My Mentees" },
          { href: "/calendar", label: "Org Calendar" },
        ]
      : [
          { href: "/mentee", label: "Dashboard" },
          { href: "/mentee/book", label: "Book 1:1 Session" },
          { href: "/mentee/mentors", label: "Find a Mentor" },
          { href: "/calendar", label: "Org Calendar" },
        ];

  if (!role) return null;

  return (
    <AppShell role={role} links={links}>
      <h1 className="text-xl font-semibold mb-1.5 text-ink">Org Calendar</h1>
      <p className="text-sm text-ink-muted mb-4">
        Every mentor&apos;s training days, visible to everyone in the program.
      </p>
      {loading ? (
        <p className="text-sm text-ink-muted">Loading...</p>
      ) : mentors.length ? (
        <TrainingCalendar mentors={mentors} canEdit={false} canSignup={false} />
      ) : (
        <p className="text-sm text-ink-muted">No active mentors yet.</p>
      )}
    </AppShell>
  );
}
