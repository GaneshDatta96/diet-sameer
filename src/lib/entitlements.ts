import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * Pay-first Kajabi purchases: payment lands before the questionnaire.
 * Entitlements are claimed when the Vercel form is submitted.
 */

export interface PaidEntitlement {
  id: string;
  email: string;
  createdAt: number;
  paymentRef: string;
  offerId?: string;
  usedAt?: number;
  usedOrderId?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "paid-entitlements.json");

let supabaseClient: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "";
  if (url && key) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    supabaseClient = null;
  }
  return supabaseClient;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function readAllFile(): Promise<Record<string, PaidEntitlement>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as Record<string, PaidEntitlement>;
  } catch {
    return {};
  }
}

async function writeAllFile(rows: Record<string, PaidEntitlement>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
}

type EntitlementRow = {
  id: string;
  email: string;
  created_at: number;
  payment_ref: string;
  offer_id: string | null;
  used_at: number | null;
  used_order_id: string | null;
};

function fromRow(row: EntitlementRow): PaidEntitlement {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    paymentRef: row.payment_ref,
    offerId: row.offer_id ?? undefined,
    usedAt: row.used_at ?? undefined,
    usedOrderId: row.used_order_id ?? undefined,
  };
}

function toRow(e: PaidEntitlement): EntitlementRow {
  return {
    id: e.id,
    email: normalizeEmail(e.email),
    created_at: e.createdAt,
    payment_ref: e.paymentRef,
    offer_id: e.offerId ?? null,
    used_at: e.usedAt ?? null,
    used_order_id: e.usedOrderId ?? null,
  };
}

/** Record a Kajabi payment that may not have a Vercel order yet. */
export async function recordPaidEntitlement(args: {
  email: string;
  paymentRef: string;
  offerId?: string;
}): Promise<PaidEntitlement> {
  const email = normalizeEmail(args.email);
  if (!email) throw new Error("Missing email for entitlement");

  // Idempotent on payment_ref
  const existing = await findByPaymentRef(args.paymentRef);
  if (existing) return existing;

  const entitlement: PaidEntitlement = {
    id: randomUUID(),
    email,
    createdAt: Date.now(),
    paymentRef: args.paymentRef,
    offerId: args.offerId,
  };

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("paid_entitlements").upsert(toRow(entitlement));
    if (error) {
      console.error("[entitlements] record:", error.message);
      throw new Error(error.message);
    }
    return entitlement;
  }

  const all = await readAllFile();
  all[entitlement.id] = entitlement;
  await writeAllFile(all);
  return entitlement;
}

async function findByPaymentRef(
  paymentRef: string
): Promise<PaidEntitlement | undefined> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("paid_entitlements")
      .select("*")
      .eq("payment_ref", paymentRef)
      .maybeSingle();
    if (error) {
      console.error("[entitlements] findByPaymentRef:", error.message);
      throw new Error(error.message);
    }
    return data ? fromRow(data as EntitlementRow) : undefined;
  }
  const all = await readAllFile();
  return Object.values(all).find((e) => e.paymentRef === paymentRef);
}

/** True if this email has an unused paid entitlement. */
export async function hasUnusedPaidEntitlement(email: string): Promise<boolean> {
  const e = await findUnusedPaidEntitlement(email);
  return Boolean(e);
}

export async function findUnusedPaidEntitlement(
  email: string
): Promise<PaidEntitlement | undefined> {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("paid_entitlements")
      .select("*")
      .eq("email", normalized)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[entitlements] findUnused:", error.message);
      throw new Error(error.message);
    }
    return data ? fromRow(data as EntitlementRow) : undefined;
  }

  const all = await readAllFile();
  return Object.values(all)
    .filter((e) => e.email === normalized && !e.usedAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** Mark entitlement used when an order is fulfilled from the questionnaire. */
export async function claimPaidEntitlement(
  email: string,
  orderId: string
): Promise<PaidEntitlement | undefined> {
  const unused = await findUnusedPaidEntitlement(email);
  if (!unused) return undefined;

  const updated: PaidEntitlement = {
    ...unused,
    usedAt: Date.now(),
    usedOrderId: orderId,
  };

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb
      .from("paid_entitlements")
      .update({
        used_at: updated.usedAt,
        used_order_id: orderId,
      })
      .eq("id", unused.id)
      .is("used_at", null);
    if (error) {
      console.error("[entitlements] claim:", error.message);
      throw new Error(error.message);
    }
    return updated;
  }

  const all = await readAllFile();
  if (!all[unused.id] || all[unused.id].usedAt) return undefined;
  all[unused.id] = updated;
  await writeAllFile(all);
  return updated;
}
