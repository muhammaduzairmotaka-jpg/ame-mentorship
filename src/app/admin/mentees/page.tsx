"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mentees", label: "Mentees" },
  { href: "/admin/training-calendar", label: "Training Calendar" },
  { href: "/calendar", label: "Org Calendar" },
];

export default function AdminMenteesPage() {
  const supabase = createClient();
  const [mentees, setMentees] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: menteeRows }, { data: mentorRows }] = await Promise.all([
      supabase
        .from("mentee_details")
        .select("profile_id, assigned_mentor_id, employment_status, requires_follow_up, profiles!mentee_details_profile_id_fkey(full_name,email)"),
      supabase.from("profiles").select("id, full_name").eq("role", "mentor").eq("is_active", true),
    ]);
    setMentees(menteeRows ?? []);
    setMentors(mentorRows ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function assignMentor(profileId: string, mentorId: string) {
    await supabase.from("mentee_details")
      .update({ assigned_mentor_id: mentorId || null })
      .eq("profile_id", profileId);
    load();
  }

  async function exportCsv() {
    const rows = [
      ["Name", "Email", "Assigned mentor", "Employment status", "Needs follow-up"],
      ...mentees.map((m) => [
        m.profiles?.full_name, m.profiles?.email,
        mentors.find((x) => x.id === m.assigned_mentor_id)?.full_name ?? "",
        m.employment_status, m.requires_follow_up ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mentees.csv"; a.click();
  }

  return (
    <AppShell role="admin" links={links}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-ink">Mentees</h1>
        <button onClick={exportCsv} className="rounded-md border border-cream-border px-3 py-1.5 text-sm hover:bg-cream">
          Export CSV
        </button>
      </div>

      {loading ? <p className="text-sm text-ink-muted">Loading...</p> : (
        <table className="w-full text-sm bg-white rounded-lg border border-cream-border overflow-hidden">
          <thead className="bg-cream-card text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Assigned mentor</th>
              <th className="px-3 py-2">Employment status</th>
              <th className="px-3 py-2">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {mentees.map((m) => (
              <tr key={m.profile_id} className="border-t border-cream-border">
                <td className="px-3 py-2">{m.profiles?.full_name}</td>
                <td className="px-3 py-2 text-ink-muted">{m.profiles?.email}</td>
                <td className="px-3 py-2">
                  <select value={m.assigned_mentor_id ?? ""} onChange={(e) => assignMentor(m.profile_id, e.target.value)}
                    className="rounded-md border border-cream-border px-2 py-1 text-xs">
                    <option value="">Unassigned</option>
                    {mentors.map((mt) => <option key={mt.id} value={mt.id}>{mt.full_name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 capitalize">{m.employment_status?.replace(/_/g," ")}</td>
                <td className="px-3 py-2">{m.requires_follow_up ? <span className="text-warn font-medium">Yes</span> : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
