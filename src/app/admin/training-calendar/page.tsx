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
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("role", "mentor").eq("is_active", true);
      setMentors(data ?? []);
      if (data && data.length) setSelected(data[0].id);
    })();
  }, []);

  return (
    <AppShell role="admin" links={links}>
      <h1 className="text-2xl font-semibold mb-6">Training Calendar</h1>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1">Managing availability for</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      </div>

      {selected && <TrainingCalendar mentorId={selected} canEdit canSignup={false} />}
      {!mentors.length && <p className="text-sm text-slate-500">No active mentors yet. Add one from the Mentees page or database first.</p>}
    </AppShell>
  );
}
