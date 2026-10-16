import { config } from "@/lib/config";

/** Post-questionnaire / email upsell for the $39 Gut Freedom Intensive. */
export function IntensiveOfferCard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const href = config.intensive.checkoutUrl || config.brand.bookCallUrl;
  const price = config.intensive.priceLabel;

  return (
    <div
      className={`rounded-2xl border border-amber/40 bg-gradient-to-br from-amber/15 via-cream-card to-green/10 ${
        compact ? "p-5" : "p-7"
      }`}
    >
      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-amber">
        Next step · {price}
      </p>
      <h3
        className={`mt-2 font-display font-bold text-teal-deep ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        {config.intensive.name}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {config.intensive.blurb}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink">
        {config.intensive.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-green">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <a
        href={href}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-display font-bold text-teal-deep transition hover:brightness-105"
      >
        Get the Intensive · {price} →
      </a>
      <p className="mt-3 text-xs text-muted">
        One-time. Educational support — not medical advice.
      </p>
    </div>
  );
}
