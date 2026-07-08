"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "./Logo";
import { BookCallCard } from "./BookCallCard";

interface ConfirmResult {
  ok: boolean;
  deliverAt?: number;
  window?: { min: number; max: number };
  waiting?: boolean;
}

async function pollUntilFulfilled(orderId: string, kajabi: boolean) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, kajabi: kajabi || undefined }),
    });
    const data = await res.json();
    if (res.ok && data.ok) return data as ConfirmResult;
    if (res.status !== 202) {
      throw new Error(data.error ?? "Could not confirm your order");
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    "Payment is still processing. Check your email — your plan will arrive shortly."
  );
}

export function ConfirmView() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const sessionId = params.get("session_id");
  const mock = params.get("mock");
  const kajabi = params.get("kajabi") === "1";

  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [firstName, setFirstName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = kajabi
          ? await pollUntilFulfilled(orderId, true)
          : await (async () => {
              const res = await fetch("/api/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  sessionId: sessionId ?? undefined,
                  mock: mock === "1",
                }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error ?? "Could not confirm your order");
              return json as ConfirmResult;
            })();
        if (cancelled) return;
        setResult(data);
        setState("done");

        const statusRes = await fetch(`/api/order/${orderId}`);
        if (statusRes.ok) {
          const s = await statusRes.json();
          if (!cancelled) setFirstName(s.firstName ?? "");
        }
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, sessionId, mock, kajabi]);

  if (!orderId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8">
        <Logo />
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="rounded-2xl border border-rust/30 bg-rust/5 p-6 text-center">
            <h1 className="font-display text-2xl font-bold text-rust">
              We hit a snag
            </h1>
            <p className="mt-2 text-ink">Missing order reference.</p>
            <a
              href="/plan"
              className="mt-5 inline-block rounded-full bg-teal-deep px-6 py-3 font-display font-bold text-white"
            >
              Try again
            </a>
          </div>
        </div>
      </div>
    );
  }

  const window = result?.window ?? { min: 8, max: 12 };
  const eta = result?.deliverAt
    ? new Date(result.deliverAt).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8">
      <Logo />

      <div className="flex flex-1 flex-col justify-center py-10">
        {state === "working" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center gap-1.5">
              <span className="h-3 w-3 animate-bounce rounded-full bg-green [animation-delay:-0.2s]" />
              <span className="h-3 w-3 animate-bounce rounded-full bg-amber [animation-delay:-0.1s]" />
              <span className="h-3 w-3 animate-bounce rounded-full bg-rust" />
            </div>
            <h1 className="font-display text-2xl font-bold text-teal-deep">
              Confirming your order…
            </h1>
            <p className="mt-2 text-muted">One moment.</p>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border border-rust/30 bg-rust/5 p-6 text-center">
            <h1 className="font-display text-2xl font-bold text-rust">
              We hit a snag
            </h1>
            <p className="mt-2 text-ink">{errorMsg}</p>
            <p className="mt-2 text-sm text-muted">
              If you were charged, don&apos;t worry — reply to your receipt and
              we&apos;ll sort it out right away.
            </p>
            <a
              href="/plan"
              className="mt-5 inline-block rounded-full bg-teal-deep px-6 py-3 font-display font-bold text-white"
            >
              Try again
            </a>
          </div>
        )}

        {state === "done" && (
          <div className="animate-fade-in-up">
            <div className="rounded-2xl border border-green/30 bg-green/5 p-7 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green text-2xl text-white">
                ✓
              </div>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-green">
                Payment received
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-teal-deep">
                {firstName ? `${firstName}, your` : "Your"} plan is being crafted
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-muted">
                Good plans aren&apos;t spat out by a machine in two seconds.
                We&apos;re building your 7 days on the traffic-light foundation
                and hand-finishing it for your answers. It will land in your
                inbox within{" "}
                <span className="font-semibold text-teal-deep">
                  {window.min}–{window.max} hours
                </span>
                {eta ? ` (around ${eta})` : ""}.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-white p-6">
              <h2 className="font-display text-lg font-bold text-teal-deep">
                While you wait — a head start
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-ink">
                <li className="flex gap-2">
                  <span className="text-green">🟢</span> Build meals around
                  fatty ruminant meat, eggs, fatty fish and natural animal fats.
                </li>
                <li className="flex gap-2">
                  <span className="text-amber">🟡</span> Salt your food more than
                  you think, and keep water steady.
                </li>
                <li className="flex gap-2">
                  <span className="text-rust">🔴</span> For now, skip seed oils,
                  grains, legumes, raw high-fiber veg and alcohol.
                </li>
              </ul>
              <p className="mt-4 text-xs italic text-muted">
                Your plan is generic and educational — based on population-level
                patterns, not your labs or history, and not medical advice.
              </p>
            </div>

            <div className="mt-6">
              <BookCallCard
                heading="Don't wait for the email — book your free call"
                body="Your plan is a starting map. The real results come from a plan built around your body, your history and how you're responding. Book a free 30-minute Gut Freedom Strategy Call — no pressure, no obligation."
              />
            </div>

            <p className="mt-6 text-center text-sm text-muted">
              Didn&apos;t get it? Check spam, or reply to your receipt and
              we&apos;ll resend.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
