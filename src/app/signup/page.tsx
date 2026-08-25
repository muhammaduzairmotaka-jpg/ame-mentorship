"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLE_ACCESS_CODES, passwordForRole, saveAccessCode } from "@/lib/authCodes";

type Role = "mentee" | "mentor" | "admin";

const ROLES: { value: Role; label: string }[] = [
  { value: "mentee", label: "Mentee" },
  { value: "mentor", label: "Mentor" },
  { value: "admin", label: "Admin" },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("mentee");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (role !== "mentee" && accessCode.trim() !== ROLE_ACCESS_CODES[role]) {
      setError(`That access code doesn't match the ${role} code.`);
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: passwordForRole(role),
      options: { data: { full_name: fullName, role } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Could not create account.");
      setLoading(false);
      return;
    }

    // If email confirmations are off, signUp already returns a session and
    // we can go straight in. Otherwise, ask them to confirm first.
    if (data.session) {
      if (role !== "mentee") saveAccessCode(role, accessCode.trim());
      router.push(`/${role}`);
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordForRole(role),
    });

    if (!signInError) {
      if (role !== "mentee") saveAccessCode(role, accessCode.trim());
      router.push(`/${role}`);
      router.refresh();
      return;
    }

    setNeedsConfirmation(true);
    setLoading(false);
  }

  if (needsConfirmation) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 text-center bg-cream">
        <div>
          <h1 className="text-xl font-semibold mb-2 text-ink">Check your email</h1>
          <p className="text-ink-muted">We sent a confirmation link to {email}. Once confirmed, log in to get started.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-cream">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-cream-border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-ink mb-1">AME Mentorship</p>
        <h1 className="text-xl font-semibold mb-6 text-ink">Create an account</h1>

        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <label className="block text-sm font-medium mb-1 text-ink">Full name</label>
        <input required value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full mb-4 rounded-md border border-cream-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-border" />

        <label className="block text-sm font-medium mb-1 text-ink">Email</label>
        <input type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-md border border-cream-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-border" />

        <label className="block text-sm font-medium mb-1 text-ink">I am a</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setRole(r.value); setAccessCode(""); }}
              className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
                role === r.value
                  ? "border-accent-border bg-accent-soft text-accent"
                  : "border-cream-border bg-cream text-ink hover:bg-cream-card"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {role !== "mentee" && (
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1 text-ink">
              {role === "admin" ? "Admin" : "Mentor"} access code
            </label>
            <input
              type="password"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Provided by your program coordinator"
              className="w-full rounded-md border border-cream-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-border"
            />
            <p className="text-xs text-ink-muted mt-1">
              This device will remember it — you won&apos;t be asked again here.
            </p>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full mt-4 rounded-md bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
          {loading ? "Creating..." : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Already have an account? <a href="/login" className="text-accent">Log in</a>
        </p>
      </form>
    </main>
  );
}
