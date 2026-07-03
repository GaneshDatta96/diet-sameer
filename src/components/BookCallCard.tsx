import { config } from "@/lib/config";

export function BookCallCard({
  heading = "Ready to draw your map?",
  body = "This plan is a generic starting point. When you're ready for a plan built around your body, your history and your labs — with Sameer guiding you the whole way — let's talk. A free 30-minute Gut Freedom Strategy Call: no pressure, no obligation, just a clear next step.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl bg-teal-deep p-7 text-white shadow-sm">
      <h3 className="font-display text-2xl font-bold">
        {heading.includes("your") ? (
          <>
            {heading.split("your")[0]}
            <span className="text-amber">your</span>
            {heading.split("your")[1]}
          </>
        ) : (
          heading
        )}
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
        {body}
      </p>
      <a
        href={config.brand.bookCallUrl}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-display font-bold text-teal-deep transition hover:brightness-105"
      >
        Book your free call →
      </a>
    </div>
  );
}
