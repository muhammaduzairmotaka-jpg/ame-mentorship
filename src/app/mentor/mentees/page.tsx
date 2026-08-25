"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

const links = [
  { href: "/mentor", label: "Dashboard" },
  { href: "/mentor/availability", label: "1:1 Availability" },
  { href: "/mentor/training-days", label: "Training Days" },
  { href: "/mentor/mentees", label: "My Mentees" },
  { href: "/calendar", label: "Org Calendar" },
];

const RATINGS = [
  { value: "not_yet_assessed", label: "Not yet assessed" },
  { value: "needs_significant_development", label: "Needs significant development" },
  { value: "developing", label: "Developing" },
  { value: "meets_expectations", label: "Meets expectations" },
  { value: "exceeds_expectations", label: "Exceeds expectations" },
  { value: "completed", label: "Completed" },
];

export default function MentorMenteesPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [mentees, setMentees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    mentee_id: "",
    category_id: "",
    rating: "developing",
    written_feedback: "",
    visible_to_mentee: true,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: menteeRows }, { data: catRows }, { data: assessRows }] = await Promise.all([
      supabase
        .from("mentee_details")
        .select("profile_id, profiles!mentee_details_profile_id_fkey(full_name, email)")
        .eq("assigned_mentor_id", user.id),
      supabase.from("development_categories").select("id, name").eq("is_active", true).order("display_order"),
      supabase
        .from("assessments")
        .select("id, rating, written_feedback, assessed_at, mentee_id, development_categories(name), profiles!assessments_mentee_id_fkey(full_name)")
        .eq("assessor_id", user.id)
        .order("assessed_at", { ascending: false })
        .limit(10),
    ]);

    setMentees(menteeRows ?? []);
    setCategories(catRows ?? []);
    setRecentAssessments(assessRows ?? []);
    if (menteeRows?.length && !form.mentee_id) setForm((f) => ({ ...f, mentee_id: menteeRows[0].profile_id }));
    if (catRows?.length && !form.category_id) setForm((f) => ({ ...f, category_id: catRows[0].id }));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !form.mentee_id || !form.category_id) return;
    setSaving(true);
    setStatus(null);

    const { error } = await supabase.from("assessments").insert({
      mentee_id: form.mentee_id,
      category_id: form.category_id,
      assessor_id: userId,
      rating: form.rating,
      written_feedback: form.written_feedback || null,
      visible_to_mentee: form.visible_to_mentee,
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Assessment saved.");
      setForm((f) => ({ ...f, written_feedback: "" }));
      load();
    }
    setSaving(false);
  }

  return (
    <AppShell role="mentor" links={links}>
      <h1 className="text-xl font-semibold mb-1.5 text-ink">My Mentees</h1>
      <p className="text-sm text-ink-muted mb-6">Record a workforce-development assessment for one of your assigned mentees.</p>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading...</p>
      ) : !mentees.length ? (
        <p className="text-sm text-ink-muted">No mentees assigned to you yet — an admin assigns mentees from the Mentees page.</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-cream-border p-4 mb-6 space-y-3 max-w-lg">
            <div>
              <label className="block text-xs font-medium mb-1 text-ink">Mentee</label>
              <select value={form.mentee_id} onChange={(e) => setForm({ ...form, mentee_id: e.target.value })}
                className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm">
                {mentees.map((m) => (
                  <option key={m.profile_id} value={m.profile_id}>{m.profiles?.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-ink">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!categories.length && <p className="text-xs text-warn mt-1">No development categories set up yet — ask an admin to add some.</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-ink">Rating</label>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm">
                {RATINGS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-ink">Written feedback</label>
              <textarea value={form.written_feedback} onChange={(e) => setForm({ ...form, written_feedback: e.target.value })}
                rows={3} className="w-full rounded-md border border-cream-border px-2 py-1.5 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.visible_to_mentee}
                onChange={(e) => setForm({ ...form, visible_to_mentee: e.target.checked })} />
              Visible to the mentee
            </label>
            {status && <p className="text-sm text-accent bg-accent-soft rounded-md px-3 py-1.5">{status}</p>}
            <button type="submit" disabled={saving || !categories.length}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {saving ? "Saving..." : "Save assessment"}
            </button>
          </form>

          <h2 className="font-medium mb-3 text-ink">Your recent assessments</h2>
          {recentAssessments.length ? (
            <ul className="space-y-2">
              {recentAssessments.map((a) => (
                <li key={a.id} className="bg-white rounded-lg border border-cream-border px-4 py-3 text-sm">
                  <p className="font-medium text-ink">
                    {a.profiles?.full_name} — {a.development_categories?.name} — <span className="capitalize">{a.rating.replace(/_/g, " ")}</span>
                  </p>
                  {a.written_feedback && <p className="text-ink-muted mt-1">{a.written_feedback}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">No assessments recorded yet.</p>}
        </>
      )}
    </AppShell>
  );
}
