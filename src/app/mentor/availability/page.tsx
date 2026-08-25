"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

const links = [
  { href: "/mentor", label: "Dashboard" },
  { href: "/mentor/availability", label: "1:1 Availability" },
  { href: "/mentor/training-days", label: "Training Days" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const supabase = createClient();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    day_of_week: "2",
    start_time: "16:00",
    end_time: "19:00",
    session_length_minutes: 30,
    break_minutes: 10,
    capacity_per_slot: 1,
    session_type: "individual",
    location: "Online",
  });

  async function loadRules() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("mentor_availability_rules")
      .select("*")
      .eq("mentor_id", user.id)
      .order("day_of_week");
    setRules(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRules();
  }, []);

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("mentor_availability_rules").insert({
      mentor_id: user.id,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      session_length_minutes: Number(form.session_length_minutes),
      break_minutes: Number(form.break_minutes),
      capacity_per_slot: Number(form.capacity_per_slot),
      session_type: form.session_type,
      location: form.location,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Availability rule added.");
      loadRules();
    }
  }

  async function handleGenerateSessions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.rpc("generate_sessions_for_mentor", {
      p_mentor_id: user.id,
      p_days_ahead: 28,
    });
    setStatus(error ? `Error: ${error.message}` : `Generated ${data} bookable slots for the next 28 days.`);
  }

  async function handleDelete(id: string) {
    await supabase.from("mentor_availability_rules").delete().eq("id", id);
    loadRules();
  }

  return (
    <AppShell role="mentor" links={links}>
      <h1 className="text-2xl font-semibold mb-6 text-ink">Availability</h1>

      <form onSubmit={handleAddRule} className="bg-white rounded-xl border border-cream-border p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Day of week</label>
          <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm">
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Start time</label>
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">End time</label>
          <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Session length (min)</label>
          <input type="number" value={form.session_length_minutes}
            onChange={(e) => setForm({ ...form, session_length_minutes: Number(e.target.value) })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Break between (min)</label>
          <input type="number" value={form.break_minutes}
            onChange={(e) => setForm({ ...form, break_minutes: Number(e.target.value) })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Capacity per slot</label>
          <input type="number" min={1} value={form.capacity_per_slot}
            onChange={(e) => setForm({ ...form, capacity_per_slot: Number(e.target.value) })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Type</label>
          <select value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm">
            <option value="individual">Individual</option>
            <option value="group">Group</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Location</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
        </div>
        <div className="col-span-2 md:col-span-4 flex items-center gap-3 pt-2">
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
            Add recurring availability
          </button>
          <button type="button" onClick={handleGenerateSessions}
            className="rounded-md border border-cream-border px-4 py-2 text-sm font-medium hover:bg-cream">
            Generate bookable slots (next 28 days)
          </button>
        </div>
        {status && <p className="col-span-2 md:col-span-4 text-sm text-ink-muted">{status}</p>}
      </form>

      <h2 className="font-medium mb-3 text-ink">Current recurring rules</h2>
      {loading ? <p className="text-sm text-ink-muted">Loading...</p> : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border border-cream-border px-4 py-3 text-sm">
              <span>
                {DAYS[r.day_of_week]} · {r.start_time.slice(0,5)}–{r.end_time.slice(0,5)} ·
                {" "}{r.session_length_minutes}min sessions · cap {r.capacity_per_slot} · {r.session_type} · {r.location}
              </span>
              <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline">Remove</button>
            </div>
          ))}
          {!rules.length && <p className="text-sm text-ink-muted">No recurring availability set yet.</p>}
        </div>
      )}
    </AppShell>
  );
}
