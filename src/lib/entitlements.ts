import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getSql } from "./db";

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

async function writeAllFile(
  rows: Record<string, PaidEntitlement>
): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
}

type EntitlementRow = {
  id: string;
  email: string;
  created_at: number | string;
  payment_ref: string;
  offer_id: string | null;
  used_at: number | string | null;
  used_order_id: string | null;
};

function fromRow(row: EntitlementRow): PaidEntitlement {
  return {
    id: row.id,
    email: row.email,
    createdAt: Number(row.created_at),
    paymentRef: row.payment_ref,
    offerId: row.offer_id ?? undefined,
    usedAt: row.used_at != null ? Number(row.used_at) : undefined,
    usedOrderId: row.used_order_id ?? undefined,
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

  const existing = await findByPaymentRef(args.paymentRef);
  if (existing) return existing;

  const entitlement: PaidEntitlement = {
    id: randomUUID(),
    email,
    createdAt: Date.now(),
    paymentRef: args.paymentRef,
    offerId: args.offerId,
  };

  const sql = getSql();
  if (sql) {
    await sql`
      insert into paid_entitlements (
        id, email, created_at, payment_ref, offer_id, used_at, used_order_id
      )
      values (
        ${entitlement.id},
        ${entitlement.email},
        ${entitlement.createdAt},
        ${entitlement.paymentRef},
        ${entitlement.offerId ?? null},
        null,
        null
      )
      on conflict (payment_ref) do nothing
    `;
    const again = await findByPaymentRef(args.paymentRef);
    return again ?? entitlement;
  }

  const all = await readAllFile();
  all[entitlement.id] = entitlement;
  await writeAllFile(all);
  return entitlement;
}

async function findByPaymentRef(
  paymentRef: string
): Promise<PaidEntitlement | undefined> {
  const sql = getSql();
  if (sql) {
    const rows = await sql`
      select * from paid_entitlements
      where payment_ref = ${paymentRef}
      limit 1
    `;
    return rows[0] ? fromRow(rows[0] as EntitlementRow) : undefined;
  }
  const all = await readAllFile();
  return Object.values(all).find((e) => e.paymentRef === paymentRef);
}

export async function hasUnusedPaidEntitlement(email: string): Promise<boolean> {
  return Boolean(await findUnusedPaidEntitlement(email));
}

export async function findUnusedPaidEntitlement(
  email: string
): Promise<PaidEntitlement | undefined> {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;

  const sql = getSql();
  if (sql) {
    const rows = await sql`
      select * from paid_entitlements
      where email = ${normalized} and used_at is null
      order by created_at desc
      limit 1
    `;
    return rows[0] ? fromRow(rows[0] as EntitlementRow) : undefined;
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

  const usedAt = Date.now();
  const sql = getSql();
  if (sql) {
    const rows = await sql`
      update paid_entitlements
      set used_at = ${usedAt}, used_order_id = ${orderId}
      where id = ${unused.id} and used_at is null
      returning *
    `;
    return rows[0] ? fromRow(rows[0] as EntitlementRow) : undefined;
  }

  const all = await readAllFile();
  if (!all[unused.id] || all[unused.id].usedAt) return undefined;
  all[unused.id] = { ...unused, usedAt, usedOrderId: orderId };
  await writeAllFile(all);
  return all[unused.id];
}
