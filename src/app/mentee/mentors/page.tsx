"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import TrainingCalendar from "@/components/TrainingCalendar";

const links = [
  { href: "/mentee", label: "Dashboard" },
  { href: "/mentee/book", label: "Book 1:1 Session" },
  { href: "/mentee/mentors", label: "Find a Mentor" },
  { href: "/calendar", label: "Org Calendar" },
];

export default function MenteeMentors() {
  const supabase = createClient();
  const [mentors, setMentors] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data } = await supabase.from("mentor_public_profiles").select("*");
      setMentors(data ?? []);
    })();
  }, []);

  return (
    <AppShell role="mentee" links={links}>
      <h1 className="text-xl font-semibold mb-4 text-ink">Find a Mentor</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-2">
          {mentors.map((m) => (
            <button key={m.id} onClick={() => setSelected(m.id)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-sm ${selected === m.id ? "border-accent bg-accent-soft" : "border-cream-border bg-white hover:bg-cream"}`}>
              <p className="font-medium">{m.full_name}</p>
              <p className="text-xs text-ink-muted">{m.company} · {m.years_experience ?? "—"} yrs</p>
              {m.specialties?.length > 0 && <p className="text-xs text-ink-muted mt-1">{m.specialties.join(", ")}</p>}
            </button>
          ))}
          {!mentors.length && <p className="text-sm text-ink-muted">No mentors listed yet.</p>}
        </div>

        <div className="col-span-2">
          {selected && userId ? (
            <TrainingCalendar mentorId={selected} canEdit={false} canSignup currentUserId={userId} />
          ) : (
            <p className="text-sm text-ink-muted">Select a mentor to see their available training days.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
