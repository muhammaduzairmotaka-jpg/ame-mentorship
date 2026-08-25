"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import TrainingCalendar from "@/components/TrainingCalendar";

const links = [
  { href: "/mentor", label: "Dashboard" },
  { href: "/mentor/availability", label: "1:1 Availability" },
  { href: "/mentor/training-days", label: "Training Days" },
  { href: "/mentor/mentees", label: "My Mentees" },
  { href: "/calendar", label: "Org Calendar" },
];

export default function MentorTrainingDays() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, []);

  return (
    <AppShell role="mentor" links={links}>
      <h1 className="text-xl font-semibold mb-1.5">Hands-On Training Days</h1>
      <p className="text-sm text-ink-muted mb-6">
        Mark the days you're free for group hands-on training. Each day caps at 5 mentees, first come first served.
      </p>
      {userId && <TrainingCalendar mentorId={userId} canEdit canSignup={false} currentUserId={userId} />}
    </AppShell>
  );
}
