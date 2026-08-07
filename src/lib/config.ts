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

  smtp: resolveSmtpConfig(),

  /** @deprecated Use smtp — kept for callers that read config.gmail */
  get gmail() {
    const s = this.smtp;
    return {
      user: s?.user ?? "",
      appPassword: s?.pass ?? "",
      from: s?.from ?? "",
      enabled: Boolean(s),
      fromAddress: s?.from ?? "",
    };
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

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function resolveSmtpConfig(): SmtpConfig | null {
  const fromEnv = (
    process.env.SMTP_FROM ??
    process.env.GMAIL_FROM ??
    ""
  ).trim();

  let user = (
    process.env.SMTP_USER ??
    process.env.GMAIL_USER ??
    ""
  ).trim();
  let pass = (
    process.env.SMTP_PASSWORD ??
    process.env.SMTP_PASS ??
    process.env.GMAIL_APP_PASSWORD ??
    ""
  ).trim();
  let host = (process.env.SMTP_HOST ?? "").trim();
  let port = Number(process.env.SMTP_PORT ?? 465);

  const json = process.env.GMAIL_ACCOUNTS_JSON?.trim();
  if ((!user || !pass) && json) {
    try {
      const accounts = JSON.parse(json) as {
        email?: string;
        password?: string;
        smtp?: string;
        port?: number;
      }[];
      const acc = accounts[0];
      if (acc?.email && acc?.password) {
        user = acc.email.trim();
        pass = acc.password.trim();
        host = (acc.smtp ?? defaultSmtpHost(user)).trim();
        port = acc.port ?? 465;
      }
    } catch {
      console.error("[config] GMAIL_ACCOUNTS_JSON is not valid JSON");
    }
  }

  if (!user || !pass) return null;
  if (!host) host = defaultSmtpHost(user);

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from: fromEnv || `Gut Freedom <${user}>`,
  };
}

/** Pick a sensible SMTP host from the mailbox address when SMTP_HOST is unset. */
function defaultSmtpHost(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("gmail.com") || domain.includes("googlemail.com")) {
    return "smtp.gmail.com";
  }
  // Zoho Mail / Zoho Mail on custom domains (e.g. sameerdossani.co)
  if (
    domain.includes("zoho") ||
    domain.endsWith("sameerdossani.co") ||
    domain.endsWith("sameerdossani.com") ||
    domain.endsWith("sameerdossani.net")
  ) {
    return "smtp.zoho.com";
  }
  return "smtp.zoho.com";
}

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
