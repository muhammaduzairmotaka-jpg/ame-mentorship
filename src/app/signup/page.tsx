"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Public signup creates MENTEE accounts only. Mentor and admin accounts
// are created by an administrator from /admin/users (see docs) — this
// keeps the mentor/admin role elevation out of reach of public signup.
export default function SignupPage() {
  const supabase = createClient();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Could not create account.");
      setLoading(false);
      return;
    }

    // profile row + mentee_details row created via DB trigger (see 002_functions.sql)
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">Check your email</h1>
          <p className="text-slate-600">We sent a confirmation link to {form.email}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Create a mentee account</h1>

        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <label className="block text-sm font-medium mb-1">Full name</label>
        <input required value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="w-full mb-4 rounded-md border border-slate-300 px-3 py-2 text-sm" />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full mb-4 rounded-md border border-slate-300 px-3 py-2 text-sm" />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input type="password" required minLength={8} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full mb-6 rounded-md border border-slate-300 px-3 py-2 text-sm" />

        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Creating..." : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <a href="/login" className="text-blue-600">Log in</a>
        </p>
      </form>
    </main>
  );
}
