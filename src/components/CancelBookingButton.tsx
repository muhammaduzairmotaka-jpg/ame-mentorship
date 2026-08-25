"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("bookings")
      .update({
        status: "cancelled_by_mentee",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id ?? null,
      })
      .eq("id", bookingId);
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-ink-muted">Cancel this session?</span>
        <button onClick={handleCancel} disabled={loading} className="text-red-600 font-medium hover:underline disabled:opacity-50">
          {loading ? "Cancelling..." : "Yes, cancel"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-ink-muted hover:underline">Never mind</button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-xs text-red-600 hover:underline">
      Cancel
    </button>
  );
}
