"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passwordForRole, getSavedAccessCode, saveAccessCode, forgetAccessCode } from "@/lib/authCodes";

type Role = "mentee" | "mentor" | "admin";

const ROLES: { value: Role; label: string }[] = [
  { value: "mentee", label: "Mentee" },
  { value: "mentor", label: "Mentor" },
  { value: "admin", label: "Admin" },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("mentee");
  const [accessCode, setAccessCode] = useState("");
  const [rememberedCode, setRememberedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Whenever the role changes, check if this device already remembers the
  // access code for it — if so, we skip asking for it again.
  useEffect(() => {
    if (role === "mentee") { setRememberedCode(null); return; }
    setRememberedCode(getSavedAccessCode(role));
    setAccessCode("");
  }, [role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const codeToUse =
      role === "mentee" ? passwordForRole("mentee") : rememberedCode ?? accessCode;

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: codeToUse,
    });

    if (authError) {
      setError(
        role === "mentee"
          ? "We couldn't find that account. Double check your email or sign up."
          : "That email/access code combination didn't work."
      );
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .single();

    if (!profile?.is_active) {
      setError("This account has been deactivated. Contact an administrator.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.role !== role) {
      setError(`This email is registered as a ${profile.role}, not a ${role}. Pick the right role above.`);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Success — remember this device so the access code never has to be
    // typed again for this role.
    if (role !== "mentee" && accessCode) {
      saveAccessCode(role, accessCode);
    }

    router.push(`/${profile.role}`);
    router.refresh();
  }

  function handleForgetDevice() {
    if (role === "mentee") return;
    forgetAccessCode(role);
    setRememberedCode(null);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-cream">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-cream-border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-ink mb-1">AME Mentorship</p>
        <h1 className="text-xl font-semibold mb-6 text-ink">Log in</h1>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <label className="block text-sm font-medium mb-1 text-ink">I am a</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setRole(r.value); setError(null); }}
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

        <label className="block text-sm font-medium mb-1 text-ink">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-md border border-cream-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-border"
        />

        {role !== "mentee" && !rememberedCode && (
          <>
            <label className="block text-sm font-medium mb-1 text-ink">
              {role === "admin" ? "Admin" : "Mentor"} access code
            </label>
            <input
              type="password"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full mb-1 rounded-md border border-cream-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-border"
            />
            <p className="text-xs text-ink-muted mb-5">
              You&apos;ll only need this once — this device will remember it after you log in.
            </p>
          </>
        )}

        {role !== "mentee" && rememberedCode && (
          <div className="mb-6 rounded-md bg-accent-soft px-3 py-2 text-xs text-accent flex items-center justify-between">
            <span>Access code remembered on this device.</span>
            <button type="button" onClick={handleForgetDevice} className="underline">Not you?</button>
          </div>
        )}

        {role === "mentee" && <div className="mb-6" />}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Log in"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          No account? <a href="/signup" className="text-accent">Sign up</a>
        </p>
      </form>
    </main>
  );
}
