import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-800">AME Mentorship Platform</h1>
      <p className="max-w-md text-slate-600">
        Scheduling, mentor management, and workforce-development tracking for
        the AME Mentorship Organization.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700">
          Log in
        </Link>
        <Link href="/signup" className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-100">
          Create account
        </Link>
      </div>
    </main>
  );
}
