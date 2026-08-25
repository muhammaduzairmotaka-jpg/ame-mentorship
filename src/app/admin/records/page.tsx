"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mentees", label: "Mentees" },
  { href: "/admin/training-calendar", label: "Training Calendar" },
  { href: "/admin/records", label: "Records" },
  { href: "/calendar", label: "Org Calendar" },
];

export default function AdminRecordsPage() {
  const supabase = createClient();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: b }] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, rating, written_feedback, assessed_at, visible_to_mentee, profiles!assessments_mentee_id_fkey(full_name), development_categories(name), assessor:profiles!assessments_assessor_id_fkey(full_name)")
          .order("assessed_at", { ascending: false })
          .limit(50),
        supabase
          .from("bookings")
          .select("id, status, attendance_status, booked_at, mentee:profiles!bookings_mentee_id_fkey(full_name), sessions(session_date, start_time, profiles!sessions_mentor_id_fkey(full_name))")
          .order("booked_at", { ascending: false })
          .limit(50),
      ]);
      setAssessments(a ?? []);
      setBookings(b ?? []);
      setLoading(false);
    })();
  }, []);

  function exportAssessmentsCsv() {
    const rows = [
      ["Mentee", "Category", "Rating", "Assessor", "Visible to mentee", "Date", "Feedback"],
      ...assessments.map((a) => [
        a.profiles?.full_name, a.development_categories?.name, a.rating,
        a.assessor?.full_name, a.visible_to_mentee ? "Yes" : "No",
        a.assessed_at, a.written_feedback ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = "assessments.csv"; el.click();
  }

  return (
    <AppShell role="admin" links={links}>
      <h1 className="text-xl font-semibold mb-1.5 text-ink">Records</h1>
      <p className="text-sm text-ink-muted mb-6">Every assessment and booking across the whole program, in one place.</p>

      {loading ? <p className="text-sm text-ink-muted">Loading...</p> : (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-ink">Recent assessments</h2>
            <button onClick={exportAssessmentsCsv} className="rounded-md border border-cream-border px-3 py-1.5 text-sm text-ink hover:bg-cream-card">
              Export CSV
            </button>
          </div>
          {assessments.length ? (
            <table className="w-full text-sm bg-white rounded-lg border border-cream-border overflow-hidden mb-8">
              <thead className="bg-cream-card text-left">
                <tr>
                  <th className="px-3 py-2">Mentee</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Assessor</th>
                  <th className="px-3 py-2">Visible</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id} className="border-t border-cream-border">
                    <td className="px-3 py-2">{a.profiles?.full_name}</td>
                    <td className="px-3 py-2">{a.development_categories?.name}</td>
                    <td className="px-3 py-2 capitalize">{a.rating?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-ink-muted">{a.assessor?.full_name}</td>
                    <td className="px-3 py-2">{a.visible_to_mentee ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-ink-muted">{new Date(a.assessed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-ink-muted mb-8">No assessments recorded yet.</p>}

          <h2 className="font-medium mb-3 text-ink">Recent bookings</h2>
          {bookings.length ? (
            <table className="w-full text-sm bg-white rounded-lg border border-cream-border overflow-hidden">
              <thead className="bg-cream-card text-left">
                <tr>
                  <th className="px-3 py-2">Mentee</th>
                  <th className="px-3 py-2">Mentor</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-cream-border">
                    <td className="px-3 py-2">{b.mentee?.full_name}</td>
                    <td className="px-3 py-2">{b.sessions?.profiles?.full_name}</td>
                    <td className="px-3 py-2 text-ink-muted">{b.sessions?.session_date}</td>
                    <td className="px-3 py-2 capitalize">{b.status?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 capitalize text-ink-muted">{b.attendance_status?.replace(/_/g, " ") ?? "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-ink-muted">No bookings yet.</p>}
        </>
      )}
    </AppShell>
  );
}
