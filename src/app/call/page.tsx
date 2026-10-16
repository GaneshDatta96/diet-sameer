import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { config } from "@/lib/config";

export const metadata = {
  title: "Gut Freedom Strategy Call · Sameer Dossani",
  description:
    "Book a free 30-minute Gut Freedom Strategy Call with Sameer Dossani, PhD. Make the case for coaching — then book when you're ready.",
};

const CALENDLY = config.brand.bookCallUrl;

export default function StrategyCallPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(46,158,123,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 10% 80%, rgba(230,163,36,0.14), transparent 50%), linear-gradient(165deg, #f7f4ec 0%, #eef6f2 45%, #f7f4ec 100%)",
            }}
          />
          <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-14 text-center">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-green">
              Free · 30 minutes
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-teal-deep sm:text-5xl">
              Gut Freedom{" "}
              <span className="text-amber">Strategy Call</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              A clear conversation about where your gut is now, what a personal
              map would look like, and whether 1:1 coaching is the right next
              step — with no pressure and no obligation.
            </p>
            <a
              href={CALENDLY}
              className="mt-8 inline-flex rounded-full bg-teal-deep px-8 py-4 font-display text-lg font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Book your free call →
            </a>
            <p className="mt-3 text-sm text-muted">
              Opens Calendly · sameer-dossani / 30 min
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-10">
          <h2 className="text-center font-display text-3xl font-bold text-teal-deep">
            Why book a call
          </h2>
          <div className="mt-8 space-y-4">
            {[
              {
                t: "A starter plan isn’t a life plan",
                d: "A 7-day map is population-level and educational. Coaching is built around your history, labs, and how you actually respond week to week.",
              },
              {
                t: "We decide together if coaching fits",
                d: "If it isn’t a fit, you’ll leave with honest next steps. If it is, you’ll know exactly what working together looks like.",
              },
              {
                t: "Sameer, not a script",
                d: "Sameer Dossani, PhD — researcher who reversed his own autoimmune disease and coaches people stuck in the same loop of symptoms without clear answers.",
              },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-2xl border border-line bg-cream-card p-6"
              >
                <h3 className="font-display text-lg font-bold text-teal-deep">
                  {item.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-16">
          <div className="rounded-2xl bg-teal-deep p-8 text-center text-white">
            <h2 className="font-display text-2xl font-bold">
              Ready when you are
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/85">
              Pick a time that works. Bring questions. We’ll make the case for
              coaching only if it honestly serves you.
            </p>
            <a
              href={CALENDLY}
              className="mt-6 inline-flex rounded-full bg-amber px-8 py-4 font-display text-lg font-bold text-teal-deep transition hover:brightness-105"
            >
              Book on Calendly →
            </a>
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Looking for the 7-day plan instead?{" "}
            <Link href="/plan" className="font-semibold text-teal-deep underline-offset-2 hover:underline">
              Build your plan
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
