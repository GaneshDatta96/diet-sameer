import { config } from "./config";
import type { Intake } from "./types";

const TOKEN_URL = "https://api.kajabi.com/v1/oauth/token";
const API_BASE = "https://api.kajabi.com/v1";

interface KajabiToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: KajabiToken | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!config.kajabi.apiEnabled) return null;

  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.kajabi.clientId,
    client_secret: config.kajabi.clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error("[kajabi] token error:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function kajabiFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Kajabi API not configured");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      ...init?.headers,
    },
  });
  return res;
}

/** Parse email and optional order id from a Kajabi payment webhook payload. */
export function parseKajabiPaymentWebhook(body: unknown): {
  email?: string;
  orderId?: string;
  offerId?: string;
  transactionId?: string;
} {
  const root = body as Record<string, unknown>;
  const payload = (root.payload ?? root) as Record<string, unknown>;

  const member = (payload.member ?? payload.customer ?? payload.contact) as
    | Record<string, unknown>
    | undefined;
  const attrs = (member?.attributes ?? member) as Record<string, unknown>;
  const email =
    (attrs.email as string | undefined) ??
    (payload.email as string | undefined) ??
    (root.email as string | undefined);

  const offer = payload.offer as Record<string, unknown> | undefined;
  const offerAttrs = (offer?.attributes ?? offer) as Record<string, unknown>;
  const offerId =
    (offer?.id as string | undefined) ??
    (offerAttrs.id as string | undefined);

  const txn = payload.transaction as Record<string, unknown> | undefined;
  const txnAttrs = (txn?.attributes ?? txn) as Record<string, unknown>;
  const transactionId =
    (txn?.id as string | undefined) ?? (txnAttrs.id as string | undefined);

  let orderId: string | undefined;
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== "string") continue;
    if (key === "order_id" || key === "orderId" || key.startsWith("custom_")) {
      if (/^[0-9a-f-]{36}$/i.test(value) || value.length >= 8) {
        orderId = value;
        break;
      }
    }
  }

  return { email, orderId, offerId, transactionId };
}

/** Add or update a contact in Kajabi and optionally apply a tag. */
export async function syncOrderToKajabi(
  intake: Intake,
  orderId: string
): Promise<void> {
  if (!config.kajabi.apiEnabled || !config.kajabi.siteId) return;

  const createRes = await kajabiFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "contacts",
        attributes: {
          name: intake.name,
          email: intake.email,
        },
        relationships: {
          site: {
            data: { type: "sites", id: config.kajabi.siteId },
          },
        },
      },
    }),
  });

  let contactId: string | undefined;

  if (createRes.ok) {
    const created = (await createRes.json()) as {
      data?: { id?: string };
    };
    contactId = created.data?.id;
  } else if (createRes.status === 422) {
    const listRes = await kajabiFetch(
      `/contacts?filter[search]=${encodeURIComponent(intake.email)}&filter[site_id]=${config.kajabi.siteId}`
    );
    if (listRes.ok) {
      const list = (await listRes.json()) as { data?: { id: string }[] };
      contactId = list.data?.[0]?.id;
    }
  } else {
    console.error("[kajabi] create contact:", createRes.status, await createRes.text());
    return;
  }

  if (!contactId) return;

  if (config.kajabi.tagId) {
    const tagRes = await kajabiFetch(`/contacts/${contactId}/relationships/tags`, {
      method: "POST",
      body: JSON.stringify({
        data: [{ type: "contact_tags", id: config.kajabi.tagId }],
      }),
    });
    if (!tagRes.ok) {
      console.error("[kajabi] add tag:", tagRes.status, await tagRes.text());
    }
  }

  if (config.kajabi.offerId) {
    const grantRes = await kajabiFetch(
      `/contacts/${contactId}/relationships/offers`,
      {
        method: "POST",
        body: JSON.stringify({
          data: [{ type: "offers", id: config.kajabi.offerId }],
          meta: { send_customer_welcome_email: false },
        }),
      }
    );
    if (!grantRes.ok) {
      console.error("[kajabi] grant offer:", grantRes.status, await grantRes.text());
    }
  }

  console.log(`[kajabi] synced contact ${contactId} for order ${orderId}`);
}

export function verifyKajabiWebhookSecret(req: Request): boolean {
  const secret = config.kajabi.webhookSecret;
  if (!secret) return true;

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret") ??
    req.headers.get("x-kajabi-webhook-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  return provided === secret;
}

export function buildKajabiCheckoutUrl(orderId: string, email: string): string {
  const base = config.kajabi.checkoutUrl;
  const url = new URL(base);
  url.searchParams.set("email", email);
  url.searchParams.set("order_id", orderId);
  return url.toString();
}
