/**
 * Central configuration. Everything degrades gracefully so the app runs with
 * zero external keys (mock payment, offline plan generator, console "email").
 * Add the env vars in `.env.local` to switch on the real integrations.
 */

export const config = {
  brand: {
    name: "Gut Freedom",
    author: "Sameer Dossani, PhD",
    site: "https://www.sameerdossani.net",
    bookCallUrl:
      process.env.NEXT_PUBLIC_BOOK_CALL_URL ??
      "https://www.sameerdossani.net/BookNow",
  },

  price: {
    /** Price shown to the user and charged, in whole currency units. */
    amount: Number(process.env.NEXT_PUBLIC_PRICE_AMOUNT ?? 10),
    currency: (process.env.NEXT_PUBLIC_PRICE_CURRENCY ?? "usd").toLowerCase(),
    label: process.env.NEXT_PUBLIC_PRICE_LABEL ?? "$10",
  },

  /**
   * Test mode: skip payment and send the plan immediately (set SKIP_PAYWALL=0
   * and restore delivery minutes for production).
   */
  skipPaywall: process.env.SKIP_PAYWALL !== "0",

  /**
   * Delivery delay before the plan email goes out. Defaults to 0 while testing.
   * Production: set DELIVERY_MIN_MINUTES=480 and DELIVERY_MAX_MINUTES=720.
   */
  delivery: {
    minMinutes: Number(process.env.DELIVERY_MIN_MINUTES ?? 0),
    maxMinutes: Number(process.env.DELIVERY_MAX_MINUTES ?? 0),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    priceId: process.env.STRIPE_PRICE_ID ?? "",
    get enabled() {
      return Boolean(this.secretKey);
    },
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    get enabled() {
      return Boolean(this.apiKey);
    },
  },

  gmail: {
    user: process.env.GMAIL_USER ?? "",
    appPassword: process.env.GMAIL_APP_PASSWORD ?? "",
    from: process.env.GMAIL_FROM ?? "",
    get enabled() {
      return Boolean(this.user && this.appPassword);
    },
    get fromAddress() {
      return this.from || `Gut Freedom <${this.user}>`;
    },
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.RESEND_FROM ?? "Sameer Dossani <hello@sameerdossani.net>",
    get enabled() {
      return Boolean(this.apiKey);
    },
  },

  kajabi: {
    checkoutUrl: process.env.KAJABI_OFFER_CHECKOUT_URL ?? "",
    offerId: process.env.KAJABI_OFFER_ID ?? "",
    webhookSecret: process.env.KAJABI_WEBHOOK_SECRET ?? "",
    clientId: process.env.KAJABI_CLIENT_ID ?? "",
    clientSecret: process.env.KAJABI_CLIENT_SECRET ?? "",
    siteId: process.env.KAJABI_SITE_ID ?? "",
    tagId: process.env.KAJABI_TAG_ID ?? "",
    get enabled() {
      return Boolean(this.checkoutUrl);
    },
    get apiEnabled() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },

  /** Shared secret to protect the delivery cron endpoint. */
  cronSecret: process.env.CRON_SECRET ?? "",

  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export function deliveryWindowHours() {
  return {
    min: Math.round(config.delivery.minMinutes / 60),
    max: Math.round(config.delivery.maxMinutes / 60),
  };
}

/** Random delivery delay in milliseconds, within the configured window. */
export function randomDeliveryDelayMs() {
  const { minMinutes, maxMinutes } = config.delivery;
  const lo = Math.min(minMinutes, maxMinutes);
  const hi = Math.max(minMinutes, maxMinutes);
  const minutes = lo + Math.random() * (hi - lo);
  return Math.round(minutes * 60 * 1000);
}
