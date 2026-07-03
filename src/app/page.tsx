import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCallCard } from "@/components/BookCallCard";
import { config, deliveryWindowHours } from "@/lib/config";
import { SURPRISES } from "@/lib/foodGuide";

export default function Home() {
  const { min, max } = deliveryWindowHours();

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5 pt-14 pb-10 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center gap-6 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-green">
              <span className="h-2.5 w-2.5 rounded-full bg-green" /> GO
            </span>
            <span className="flex items-center gap-1.5 text-amber">
              <span className="h-2.5 w-2.5 rounded-full bg-amber" /> TEST
            </span>
            <span className="flex items-center gap-1.5 text-rust">
              <span className="h-2.5 w-2.5 rounded-full bg-rust" /> STOP
            </span>
          </div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-green">
            First principles. Real results.
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight text-teal-deep sm:text-5xl">
            Your personalized <span className="text-amber">7-day</span> gut-calming
            meal plan
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Tired of managing Crohn&apos;s, colitis or IBD symptoms without clear
            answers? Answer a few questions and get a 7-day starter plan built on
            Sameer&apos;s ancestral, evidence-informed traffic-light approach —
            hand-finished and sent to your inbox.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/plan"
              className="rounded-full bg-teal-deep px-8 py-4 font-display text-lg font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Build my 7-day plan · {config.price.label}
            </Link>
            <a
              href={config.brand.bookCallUrl}
              className="rounded-full border border-teal-deep/25 px-8 py-4 font-display text-lg font-semibold text-teal-deep transition hover:bg-white"
            >
              Or book a free call
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">
            One-time {config.price.label}. Crafted and delivered in {min}–{max}{" "}
            hours. Not medical advice.
          </p>
        </section>

        {/* Traffic light */}
        <section className="mx-auto max-w-5xl px-5 py-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <TierCard
              color="bg-green"
              label="GREEN"
              title="Nourish and calm"
              text="Nutrient-dense animal foods, easy to digest, nothing that feeds the bacteria driving your symptoms. Your foundation."
            />
            <TierCard
              color="bg-amber"
              label="YELLOW"
              title="It depends — test it"
              text="Not the enemy, not the foundation. We fold these in carefully so you can watch how your body responds."
            />
            <TierCard
              color="bg-rust"
              label="RED"
              title="Better without, for now"
              text="The usual suspects behind flares, urgency and pain — kept out while you heal."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-5 py-10">
          <h2 className="text-center font-display text-3xl font-bold text-teal-deep">
            How it works
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Step
              n={1}
              title="Tell us about you"
              text="A short, friendly form — your eating style, how often you eat meat, your restrictions, preferences and where your gut is right now."
            />
            <Step
              n={2}
              title="We craft your plan"
              text={`Your 7 days are built on the traffic-light foundation and personalized to your answers, then hand-finished. It lands in your inbox in ${min}–${max} hours.`}
            />
            <Step
              n={3}
              title="Then talk to Sameer"
              text="Your plan is a starting map, not a life sentence. When you want a plan built around your body and history, book a free call."
            />
          </div>
        </section>

        {/* Surprises */}
        <section className="mx-auto max-w-5xl px-5 py-8">
          <h2 className="text-center font-display text-3xl font-bold text-teal-deep">
            What often gets this backwards
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rust/30 bg-rust/5 p-6">
              <h3 className="font-display font-bold text-rust">
                &ldquo;Healthy&rdquo; foods that often make IBD worse
              </h3>
              <p className="mt-2 text-sm text-ink">
                {SURPRISES.worse.join(", ")}.
              </p>
            </div>
            <div className="rounded-2xl border border-green/30 bg-green/5 p-6">
              <h3 className="font-display font-bold text-green">
                Feared foods most people thrive on
              </h3>
              <p className="mt-2 text-sm text-ink">
                {SURPRISES.thrive.join(", ")}.
              </p>
            </div>
          </div>
        </section>

        {/* About Sameer */}
        <section className="mx-auto max-w-5xl px-5 py-8">
          <div className="rounded-2xl bg-teal-deep p-8 text-white">
            <h3 className="font-display text-xl font-bold">
              About Sameer Dossani, PhD
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85">
              I&apos;m not a dietitian reciting guidelines. I&apos;m a researcher
              who reversed my own autoimmune disease. At 50 I&apos;m
              medication-free, and I&apos;ve spent years helping people with
              Crohn&apos;s, colitis and IBD get to the root of their symptoms
              using an ancestral, evidence-informed approach. This plan is the
              first step of what I teach.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-5 py-10">
          <div className="mb-6 text-center">
            <Link
              href="/plan"
              className="rounded-full bg-amber px-8 py-4 font-display text-lg font-bold text-teal-deep shadow-sm transition hover:brightness-105"
            >
              Build my 7-day plan · {config.price.label}
            </Link>
          </div>
          <BookCallCard />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function TierCard({
  color,
  label,
  title,
  text,
}: {
  color: string;
  label: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-cream-card p-6">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span className="font-display text-sm font-bold tracking-wide text-ink">
          {label}
        </span>
      </div>
      <h3 className="mt-2 font-display text-lg font-bold text-teal-deep">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-cream-card p-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green font-display font-bold text-white">
        {n}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-teal-deep">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
