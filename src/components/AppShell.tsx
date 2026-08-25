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
      <aside className="w-52 shrink-0 border-r border-cream-border bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-cream-border">
          <p className="font-semibold text-ink text-sm">AME Mentorship</p>
          <span className={`inline-block mt-1 rounded px-2 py-0.5 text-[11px] font-medium capitalize ${badgeColor}`}>
            {role}
          </span>
        </div>
        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="block rounded-md px-2.5 py-1.5 text-[13px] text-ink hover:bg-cream-card">
              {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout}
          className="m-2.5 rounded-md border border-cream-border px-2.5 py-1.5 text-[13px] text-ink-muted hover:bg-cream-card">
          Log out
        </button>
      </aside>
      <main className="flex-1 px-8 py-6">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
