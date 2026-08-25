"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AppShell({
  role,
  links,
  children,
}: {
  role: "admin" | "mentor" | "mentee";
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const badgeColor =
    role === "admin" ? "bg-accent-soft text-accent"
    : role === "mentor" ? "bg-warn-soft text-warn"
    : "bg-emerald-100 text-emerald-700";

  return (
    <div className="min-h-screen flex bg-cream">
      <aside className="w-56 shrink-0 border-r border-cream-border bg-white flex flex-col">
        <div className="p-4 border-b border-cream-border">
          <p className="font-semibold text-ink text-sm">AME Mentorship</p>
          <span className={`inline-block mt-1 rounded px-2 py-0.5 text-xs font-medium capitalize ${badgeColor}`}>
            {role}
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-cream-card">
              {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout}
          className="m-3 rounded-md border border-cream-border px-3 py-2 text-sm text-ink-muted hover:bg-cream-card">
          Log out
        </button>
      </aside>
      <main className="flex-1 p-6 max-w-6xl">{children}</main>
    </div>
  );
}
