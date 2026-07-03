import { Suspense } from "react";
import { ConfirmView } from "@/components/ConfirmView";

export const metadata = {
  title: "Your plan is being crafted · Gut Freedom",
};

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">
          Loading…
        </div>
      }
    >
      <ConfirmView />
    </Suspense>
  );
}
