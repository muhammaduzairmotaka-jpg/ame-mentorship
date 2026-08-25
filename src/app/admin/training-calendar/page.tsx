"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import TrainingCalendar from "@/components/TrainingCalendar";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mentees", label: "Mentees" },
  { href: "/admin/training-calendar", label: "Training Calendar" },
];

export default function AdminTrainingCalendar() {
  const supabase = createClient();
  const [mentors, setMentors] = useState<{ id: string; full_name: string }[]>([]);
  const [editingFor, setEditingFor] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "mentor").eq("is_active", true);
      setMentors(data ?? []);
      if (data && data.length) setEditingFor(data[0].id);
    })();
  }, []);

  return (
    <AppShell role="admin" links={links}>
      <h1 className="text-xl font-semibold mb-1.5 text-ink">Training Calendar</h1>
      <p className="text-sm text-ink-muted mb-6">
        Every mentor&apos;s training days at a glance, colour-coded by mentor.
      </p>

      {mentors.length > 0 ? (
        <TrainingCalendar mentors={mentors} canEdit={false} canSignup={false} />
      ) : (
        <p className="text-sm text-ink-muted">No active mentors yet. Add one from the Mentees page or database first.</p>
      )}

      {mentors.length > 0 && (
        <div className="mt-8">
          <label className="block text-xs font-medium mb-1 text-ink">Edit availability for</label>
          <select value={editingFor} onChange={(e) => setEditingFor(e.target.value)}
            className="mb-4 rounded-md border border-cream-border px-3 py-2 text-sm">
            {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          {editingFor && <TrainingCalendar mentorId={editingFor} canEdit canSignup={false} />}
        </div>
      )}
    </AppShell>
  );
}
