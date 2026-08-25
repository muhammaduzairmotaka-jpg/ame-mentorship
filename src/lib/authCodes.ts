// Role-based access codes for the simplified sign-up/login flow.
//
// Mentees just need a name + email — no password to remember.
// Mentors and admins confirm their role with a shared access code at
// sign-up and again every time they log in.
//
// NOTE: because this file ships in client-side JS, these codes are not a
// real secret (anyone could read the deployed bundle). They act as a
// low-friction "you belong in this group" gate, not a security boundary —
// real access control still happens via Supabase auth + RLS policies once
// the account exists. Don't reuse these codes anywhere sensitive.
export const ROLE_ACCESS_CODES: Record<"admin" | "mentor", string> = {
  admin: "AME2026",
  mentor: "MENTOR2026",
};

// Mentees don't type a password at all, so we use one fixed internal
// password behind the scenes to satisfy Supabase's email/password auth.
export const MENTEE_INTERNAL_PASSWORD = "ame-mentee-2026-access";

export function passwordForRole(role: "admin" | "mentor" | "mentee"): string {
  if (role === "mentee") return MENTEE_INTERNAL_PASSWORD;
  return ROLE_ACCESS_CODES[role];
}

// Once a mentor/admin enters their access code successfully, remember it on
// this device (localStorage) so they never have to type it again here —
// only the email is needed on future logins, same as mentees.
const STORAGE_PREFIX = "ame_saved_access_";

export function getSavedAccessCode(role: "admin" | "mentor"): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_PREFIX + role);
}

export function saveAccessCode(role: "admin" | "mentor", code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + role, code);
}

export function forgetAccessCode(role: "admin" | "mentor") {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_PREFIX + role);
}
