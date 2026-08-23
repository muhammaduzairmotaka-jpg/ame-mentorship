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
    role === "admin" ? "bg-purple-100 text-purple-700"
    : role === "mentor" ? "bg-blue-100 text-blue-700"
    : "bg-emerald-100 text-emerald-700";

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800 text-sm">AME Mentorship</p>
          <span className={`inline-block mt-1 rounded px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
            {role}
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout}
          className="m-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Log out
        </button>
      </aside>
      <main className="flex-1 p-6 max-w-6xl">{children}</main>
    </div>
  );
}
