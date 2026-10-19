import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Neon Postgres (pooled DATABASE_URL) for Vercel / serverless.
 * Local file fallback in store/entitlements still works when this is unset.
 */
let sql: NeonQueryFunction<false, false> | null | undefined;

export function getSql(): NeonQueryFunction<false, false> | null {
  if (sql !== undefined) return sql;
  const url = process.env.DATABASE_URL?.trim() ?? "";
  sql = url ? neon(url) : null;
  return sql;
}

export function requireDatabase(): void {
  if (!getSql() && process.env.VERCEL === "1") {
    throw new Error("MISSING_DATABASE");
  }
}
