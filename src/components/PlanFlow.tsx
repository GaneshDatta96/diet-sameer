"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeFormInput,
  firstName,
  greeting,
  relevantRestrictions,
  restrictionLabel,
  smartPlaceholders,
} from "@/lib/formIntelligence";
import { Logo } from "./Logo";

type Diet = "meat-eater" | "semi-vegetarian" | "vegetarian";

interface FormState {
  name: string;
  email: string;
  dietType: Diet | "";
  meatFrequency: string;
  loves: string;
  dislikes: string;
  restrictions: string[];
  flareState: string;
  goal: string;
  unit: "metric" | "imperial";
  age: string;
  sex: string;
  weight: string;
  height: string;
  cookingConfidence: string;
  notes: string;
}

const initial: FormState = {
  name: "",
  email: "",
  dietType: "",
  meatFrequency: "",
  loves: "",
  dislikes: "",
  restrictions: [],
  flareState: "",
  goal: "",
  unit: "metric",
  age: "",
  sex: "",
  weight: "",
  height: "",
  cookingConfidence: "",
  notes: "",
};

const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL ?? "$10";
const SKIP_PAYWALL = process.env.NEXT_PUBLIC_SKIP_PAYWALL !== "0";

type StepKey =
  | "name"
  | "email"
  | "flareState"
  | "dietType"
  | "meatFrequency"
  | "goal"
  | "loves"
  | "dislikes"
  | "restrictions"
  | "basics"
  | "notes"
  | "understood"
  | "review";

interface StepDef {
  key: StepKey;
}

export function PlanFlow() {
  const [form, setForm] = useState<FormState>(initial);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setError(null);
    },
    []
  );

  const insights = useMemo(() => analyzeFormInput(form), [form]);
  const placeholders = useMemo(
    () => smartPlaceholders(form.dietType),
    [form.dietType]
  );
  const fn = firstName(form.name);

  // Smart step order: flare early so later questions adapt.
  const steps = useMemo<StepDef[]>(() => {
    const s: StepDef[] = [
      { key: "name" },
      { key: "email" },
      { key: "flareState" },
      { key: "dietType" },
    ];
    if (form.dietType && form.dietType !== "vegetarian") {
      s.push({ key: "meatFrequency" });
    }
    s.push(
      { key: "goal" },
      { key: "loves" },
      { key: "dislikes" },
      { key: "restrictions" },
      { key: "basics" },
      { key: "notes" },
      { key: "understood" },
      { key: "review" }
    );
    return s;
  }, [form.dietType]);

  const clampedIndex = Math.min(stepIndex, steps.length - 1);
  const current = steps[clampedIndex];
  const progress = Math.round((clampedIndex / (steps.length - 1)) * 100);

  const applySuggestedRestrictions = useCallback(() => {
    const missing = insights.inferredRestrictions.filter(
      (r) => !form.restrictions.includes(r)
    );
    if (missing.length) {
      set("restrictions", [...form.restrictions, ...missing]);
    }
  }, [form.restrictions, insights.inferredRestrictions, set]);

  const validateStep = useCallback((): string | null => {
    switch (current.key) {
      case "email": {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
        return ok ? null : "Please enter a valid email so we can send your plan.";
      }
      case "flareState":
        return form.flareState ? null : "Let us know where your gut is right now.";
      case "dietType":
        return form.dietType ? null : "Pick the option closest to how you eat.";
      case "meatFrequency":
        return form.meatFrequency ? null : "Choose how often you eat meat.";
      case "goal":
        return form.goal ? null : "Pick your main goal.";
      default:
        return null;
    }
  }, [current.key, form]);

  const next = useCallback((opts?: { skipValidation?: boolean }) => {
    if (!opts?.skipValidation) {
      const err = validateStep();
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [validateStep, steps.length]);

  const back = useCallback(() => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
      };
      const orderRes = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? "Something went wrong");

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });
      const checkout = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkout.error ?? "Payment setup failed");

      window.location.href = checkout.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }, [form]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault();
      if (current.key === "review") submit();
      else next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current.key, next, submit]);

  const advanceSoon = useCallback(() => {
    // Skip validation — the timeout can run before React applies the selection,
    // and the choice itself satisfies the step requirement.
    window.setTimeout(() => next({ skipValidation: true }), 220);
  }, [next]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="fixed inset-x-0 top-0 z-10 h-1.5 bg-line/60">
        <div
          className="h-full bg-green transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-xs font-semibold text-muted">
            {clampedIndex + 1} / {steps.length}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div key={current.key} className="animate-fade-in-up">
            {renderStep({
              key: current.key,
              form,
              set,
              advanceSoon,
              insights,
              placeholders,
              fn,
              applySuggestedRestrictions,
            })}

            {error && (
              <p className="mt-4 text-sm font-medium text-rust">{error}</p>
            )}

            <div className="mt-8 flex items-center gap-3">
              {clampedIndex > 0 && (
                <button
                  onClick={back}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-muted transition hover:bg-white"
                >
                  ← Back
                </button>
              )}
              {current.key === "review" ? (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-full bg-teal-deep px-7 py-3 font-display font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting
                    ? "Setting up…"
                    : SKIP_PAYWALL
                      ? "Send my plan →"
                      : `Pay ${PRICE_LABEL} & craft my plan`}
                </button>
              ) : (
                <button
                  onClick={() => next()}
                  className="rounded-full bg-teal-deep px-7 py-3 font-display font-bold text-white shadow-sm transition hover:brightness-110"
                >
                  {current.key === "understood" ? "Looks right →" : "OK →"}
                </button>
              )}
              {current.key !== "review" && current.key !== "understood" && (
                <span className="hidden text-xs text-muted sm:inline">
                  press <kbd className="font-semibold">Enter ↵</kbd>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step renderer ---------------- */

interface RenderCtx {
  key: StepKey;
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  advanceSoon: () => void;
  insights: ReturnType<typeof analyzeFormInput>;
  placeholders: ReturnType<typeof smartPlaceholders>;
  fn: string;
  applySuggestedRestrictions: () => void;
}

function renderStep(ctx: RenderCtx) {
  const { key, form, set, advanceSoon, insights, placeholders, fn, applySuggestedRestrictions } = ctx;

  switch (key) {
    case "name":
      return (
        <Screen
          eyebrow="Let's begin"
          title="First, what should we call you?"
          help="Your plan will be addressed to you. First name is fine."
        >
          <TextInput
            value={form.name}
            onChange={(v) => set("name", v)}
            placeholder="e.g. Alex"
            autoFocus
          />
        </Screen>
      );

    case "email":
      return (
        <Screen
          eyebrow={fn ? `${greeting(form.name)} — almost` : "Where should we send it?"}
          title="What's your email?"
          help="We'll email your finished 7-day plan here. No spam."
        >
          <TextInput
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="you@example.com"
            autoFocus
          />
        </Screen>
      );

    case "flareState":
      return (
        <Screen
          eyebrow="Right now"
          title={
            fn
              ? `${fn}, where is your gut this week?`
              : "Where is your gut this week?"
          }
          help="This shapes the whole plan — be honest. In an active flare we keep strictly to the green foundation."
        >
          <Choice
            options={[
              {
                value: "active-flare",
                label: "In an active flare",
                desc: "Symptoms are loud right now — we'll keep this week green-only.",
              },
              {
                value: "settling",
                label: "Settling / recovering",
                desc: "Things are improving but still delicate.",
              },
              {
                value: "calm",
                label: "Relatively calm",
                desc: "Room to test a few yellow foods carefully.",
              },
              { value: "not-sure", label: "Not sure" },
            ]}
            value={form.flareState}
            onSelect={(v) => {
              set("flareState", v);
              advanceSoon();
            }}
          />
        </Screen>
      );

    case "dietType":
      return (
        <Screen
          eyebrow="Your eating style"
          title="Which best describes how you eat?"
          help={
            form.flareState === "active-flare"
              ? "Even in a flare, nutrient-dense animal foods are the fastest way to calm an inflamed gut."
              : "This shapes the whole plan. You can note details in your own words later."
          }
        >

          <Choice
            options={[
              {
                value: "meat-eater",
                label: "Meat eater",
                desc: "Meat, fish, eggs — the full animal-based foundation.",
              },
              {
                value: "semi-vegetarian",
                label: "Semi-vegetarian",
                desc: "Some meat or fish, but not every day.",
              },
              {
                value: "vegetarian",
                label: "Vegetarian",
                desc: "No meat or fish. Eggs and dairy are okay.",
              },
            ]}
            value={form.dietType}
            onSelect={(v) => {
              set("dietType", v as Diet);
              if (v === "vegetarian") set("meatFrequency", "never");
              advanceSoon();
            }}
          />
        </Screen>
      );

    case "meatFrequency":
      return (
        <Screen
          eyebrow="Meat & fish"
          title="How often do you eat meat or fish?"
          help="We'll space animal-flesh meals across your week to match — not every meal needs meat."
        >
          <Choice
            options={[
              { value: "daily", label: "Most days" },
              { value: "few-times-week", label: "A few times a week" },
              { value: "weekly", label: "About once a week" },
              { value: "rarely", label: "Rarely" },
            ]}
            value={form.meatFrequency}
            onSelect={(v) => {
              set("meatFrequency", v);
              advanceSoon();
            }}
          />
        </Screen>
      );

    case "goal":
      return (
        <Screen
          eyebrow="Your goal"
          title={
            fn ? `${fn}, what matters most right now?` : "What matters most right now?"
          }
          help={
            form.flareState === "active-flare"
              ? "Calming symptoms is usually the priority in a flare — but tell us what you're aiming for."
              : "This tweaks portions, starches and emphasis across your week."
          }
        >
          <Choice
            options={[
              { value: "calm-symptoms", label: "Calm my symptoms" },
              { value: "gain-weight", label: "Gain / hold weight" },
              { value: "lose-weight", label: "Lose weight" },
              { value: "more-energy", label: "More energy" },
              { value: "maintain", label: "Maintain & feel good" },
            ]}
            value={form.goal}
            onSelect={(v) => {
              set("goal", v);
              advanceSoon();
            }}
          />
        </Screen>
      );

    case "loves":
      return (
        <Screen
          eyebrow="Preferences"
          title="Foods you especially enjoy?"
          help="Optional — type in your own words. We'll lean into these where they fit the green or yellow tiers."
        >
          <TextArea
            value={form.loves}
            onChange={(v) => set("loves", v)}
            placeholder={placeholders.loves}
            autoFocus
          />
          {insights.emphasizeFoods.length > 0 && (
            <InsightPanel lines={insights.liveAcknowledgments} />
          )}
        </Screen>
      );

    case "dislikes":
      return (
        <Screen
          eyebrow="Preferences"
          title="Anything you'd rather avoid?"
          help="Type naturally — e.g. “dairy bloats me” or “can't do sardines”. We'll read between the lines."
        >
          <TextArea
            value={form.dislikes}
            onChange={(v) => set("dislikes", v)}
            placeholder={placeholders.dislikes}
            autoFocus
          />
          <InsightPanel lines={insights.liveAcknowledgments} />
        </Screen>
      );

    case "restrictions": {
      const relevant = relevantRestrictions(form.dietType);
      const options = relevant.map((r) => ({
        value: r,
        label: restrictionLabel(r),
        suggested: insights.inferredRestrictions.includes(r),
      }));
      const unapplied = insights.inferredRestrictions.filter(
        (r) => !form.restrictions.includes(r)
      );

      return (
        <Screen
          eyebrow="Restrictions"
          title="Any hard dietary restrictions?"
          help="Tap all that apply — or skip. We've highlighted suggestions from what you wrote."
        >
          {unapplied.length > 0 && (
            <button
              type="button"
              onClick={applySuggestedRestrictions}
              className="mb-4 w-full rounded-xl border border-green/40 bg-green/10 px-4 py-3 text-left text-sm text-teal-deep transition hover:bg-green/15"
            >
              <span className="font-semibold">Suggested from your answers: </span>
              {unapplied.map(restrictionLabel).join(", ")}
              <span className="ml-1 text-green">— tap to add all</span>
            </button>
          )}
          <MultiChoice
            options={options}
            values={form.restrictions}
            onToggle={(v) => {
              const has = form.restrictions.includes(v);
              set(
                "restrictions",
                has
                  ? form.restrictions.filter((x) => x !== v)
                  : [...form.restrictions, v]
              );
            }}
          />
        </Screen>
      );
    }

    case "basics":
      return (
        <Screen
          eyebrow="A few basics"
          title="Optional details to tune portions"
          help={
            form.goal === "gain-weight"
              ? "Weight and height help us right-size rice and fats — especially if you're trying to hold weight on."
              : "All optional — but they help us right-size the plan for you."
          }
        >
          <div className="space-y-4">
            <UnitToggle unit={form.unit} onChange={(u) => set("unit", u)} />
            <div className="grid grid-cols-2 gap-3">
              <SmallField label="Age">
                <input
                  className="brand-focus w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="e.g. 42"
                />
              </SmallField>
              <SmallField label="Sex">
                <select
                  className="brand-focus w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink"
                  value={form.sex}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </SmallField>
              <SmallField
                label={`Weight (${form.unit === "metric" ? "kg" : "lb"})`}
              >
                <input
                  className="brand-focus w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink"
                  inputMode="numeric"
                  value={form.weight}
                  onChange={(e) => set("weight", e.target.value)}
                  placeholder={form.unit === "metric" ? "e.g. 72" : "e.g. 160"}
                />
              </SmallField>
              <SmallField
                label={`Height (${form.unit === "metric" ? "cm" : "in"})`}
              >
                <input
                  className="brand-focus w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink"
                  inputMode="numeric"
                  value={form.height}
                  onChange={(e) => set("height", e.target.value)}
                  placeholder={form.unit === "metric" ? "e.g. 175" : "e.g. 69"}
                />
              </SmallField>
            </div>
          </div>
        </Screen>
      );

    case "notes":
      return (
        <Screen
          eyebrow="Anything else?"
          title="Anything we should know?"
          help="Medications, other conditions, cooking constraints — say it in plain language."
        >
          <TextArea
            value={form.notes}
            onChange={(v) => set("notes", v)}
            placeholder={placeholders.notes}
            autoFocus
          />
          <InsightPanel lines={insights.liveAcknowledgments} />
          {insights.showConsultNudge && <ConsultNudge />}
        </Screen>
      );

    case "understood":
      return (
        <Screen
          eyebrow="Here's what we heard"
          title={
            fn
              ? `${fn}, does this sound right?`
              : "Does this sound right?"
          }
          help="We read your answers — including the free-text parts — before crafting your plan."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-green/30 bg-green/5 p-5">
              <p className="font-display text-sm font-bold text-teal-deep">
                Your starting map
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {insights.planStrategy}
              </p>
            </div>

            {insights.liveAcknowledgments.length > 0 && (
              <ul className="space-y-2 text-sm text-muted">
                {insights.liveAcknowledgments.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-green">✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}

            {insights.contradictions.length > 0 && (
              <InlineNote tone="amber">
                {insights.contradictions.join(" ")}
              </InlineNote>
            )}

            {insights.showConsultNudge && <ConsultNudge />}
          </div>
        </Screen>
      );

    case "review":
      return <Review form={form} insights={insights} />;
  }
}

/* ---------------- Smart UI pieces ---------------- */

function InsightPanel({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="mt-4 space-y-2 rounded-xl border border-green/25 bg-green/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-green">
        We&apos;re noting
      </p>
      {lines.map((line) => (
        <p key={line} className="text-sm text-ink">
          {line}
        </p>
      ))}
    </div>
  );
}

function ConsultNudge() {
  return (
    <div className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 p-4">
      <p className="font-display text-sm font-bold text-teal-deep">
        A quick call may be the better next step
      </p>
      <p className="mt-1 text-sm text-muted">
        Based on what you shared, a generic plan has real limits. Sameer offers a
        free 30-minute Gut Freedom Strategy Call — no pressure, just an honest
        recommendation.
      </p>
      <a
        href={
          process.env.NEXT_PUBLIC_BOOK_CALL_URL ??
          "https://www.sameerdossani.net/BookNow"
        }
        className="mt-3 inline-block text-sm font-semibold text-teal-deep underline-offset-2 hover:underline"
      >
        Book a free call →
      </a>
    </div>
  );
}

function InlineNote({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "green";
}) {
  const cls =
    tone === "amber"
      ? "border-amber/40 bg-amber/10 text-ink"
      : "border-green/30 bg-green/5 text-ink";
  return (
    <p className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>
      {children}
    </p>
  );
}

/* ---------------- Presentational pieces ---------------- */

function Screen({
  eyebrow,
  title,
  help,
  children,
}: {
  eyebrow: string;
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-green">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold leading-snug text-teal-deep sm:text-3xl">
        {title}
      </h2>
      {help && <p className="mt-2 text-sm text-muted">{help}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="brand-focus w-full border-b-2 border-line bg-transparent pb-2 text-2xl text-ink placeholder:text-muted/50 focus:border-green"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="brand-focus w-full rounded-xl border border-line bg-white p-4 text-lg text-ink placeholder:text-muted/50 focus:border-green"
    />
  );
}

function Choice({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string; desc?: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={`block w-full rounded-2xl border-2 p-4 text-left transition ${
              active
                ? "border-green bg-green/10"
                : "border-line bg-white hover:border-green/50"
            }`}
          >
            <span className="font-display font-bold text-teal-deep">
              {o.label}
            </span>
            {o.desc && (
              <span className="mt-1 block text-sm text-muted">{o.desc}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice({
  options,
  values,
  onToggle,
}: {
  options: { value: string; label: string; suggested?: boolean }[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const active = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition ${
              active
                ? "border-green bg-green text-white"
                : o.suggested
                  ? "border-amber bg-amber/15 text-teal-deep hover:border-amber"
                  : "border-line bg-white text-ink hover:border-green/50"
            }`}
          >
            {active ? "✓ " : o.suggested ? "★ " : ""}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function UnitToggle({
  unit,
  onChange,
}: {
  unit: "metric" | "imperial";
  onChange: (u: "metric" | "imperial") => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-white p-1">
      {(["metric", "imperial"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
            unit === u ? "bg-teal-deep text-white" : "text-muted"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function SmallField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function Review({
  form,
  insights,
}: {
  form: FormState;
  insights: ReturnType<typeof analyzeFormInput>;
}) {
  const rows: [string, string][] = [
    ["Name", form.name || "—"],
    ["Email", form.email || "—"],
    ["Gut right now", pretty(form.flareState)],
    ["Eating style", pretty(form.dietType)],
    ...(form.dietType !== "vegetarian"
      ? ([["Meat / fish", pretty(form.meatFrequency)]] as [string, string][])
      : []),
    ["Main goal", pretty(form.goal)],
    ["Restrictions", form.restrictions.map(pretty).join(", ") || "None"],
    ["Enjoys", form.loves || "—"],
    ["Avoids", form.dislikes || "—"],
  ];

  return (
    <Screen
      eyebrow="Almost there"
      title="Quick review, then we craft your plan"
      help={
        SKIP_PAYWALL
          ? "We'll email your personalized 7-day plan right away."
          : `One-time ${PRICE_LABEL}. Hand-finished and emailed to you — not instant on screen.`
      }
    >
      <div className="rounded-2xl border border-green/30 bg-green/5 p-4 text-sm text-ink">
        {insights.planStrategy}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <dl className="divide-y divide-line/70">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 text-sm">
              <dt className="font-semibold text-muted">{k}</dt>
              <dd className="text-right text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-4 rounded-xl bg-amber/10 p-4 text-xs leading-relaxed text-ink">
        Educational plan based on population-level patterns — not medical advice,
        not tailored to your labs. You&apos;ll be invited to book a free call with
        Sameer for a plan built around you.
      </p>
    </Screen>
  );
}

function pretty(v: string): string {
  if (!v) return "—";
  return v.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
