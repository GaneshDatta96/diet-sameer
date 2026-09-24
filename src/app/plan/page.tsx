import { Suspense } from "react";
import { PlanFlow } from "@/components/PlanFlow";

export const metadata = {
  title: "Build your 7-day plan · Gut Freedom",
};

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
          Loading…
        </div>
      }
    >
      <PlanFlow />
    </Suspense>
  );
}
