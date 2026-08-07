/**
 * Quick Zoho SMTP connectivity + send test.
 *   node --require ./scripts/load-env.cjs --import tsx scripts/test-zoho-smtp.ts
 */
import nodemailer from "nodemailer";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    // optional
  }
}

const hosts = [
  process.env.SMTP_HOST || "smtp.zoho.com",
  "smtppro.zoho.com",
  "smtp.zoho.in",
];

const user = (process.env.SMTP_USER || "").trim();
const pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "").trim();
const from = (process.env.SMTP_FROM || `Gut Freedom <${user}>`).trim();
const port = Number(process.env.SMTP_PORT || 465);
const to = process.env.TEST_TO || user;

async function tryHost(host: string) {
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    family: 4,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  } as any);

  console.log(`→ verify ${host}:${port} as ${user} ...`);
  await transport.verify();
  console.log(`  verify OK`);

  const info = await transport.sendMail({
    from,
    to,
    subject: "Gut Freedom · Zoho SMTP test",
    text: `Zoho SMTP test from ${host} at ${new Date().toISOString()}`,
    html: `<p>Zoho SMTP test from <b>${host}</b>.</p><p>If you got this, outbound mail works.</p>`,
  });
  console.log(`  sent OK → ${to} id=${info.messageId}`);
  return host;
}

async function main() {
  if (!user || !pass) {
    console.error("Missing SMTP_USER or SMTP_PASSWORD in .env");
    process.exit(1);
  }
  console.log(`From: ${from}`);
  console.log(`To:   ${to}`);

  const uniqueHosts = [...new Set(hosts)];
  let lastErr: unknown;
  for (const host of uniqueHosts) {
    try {
      const ok = await tryHost(host);
      console.log(`\nSUCCESS via ${ok}`);
      process.exit(0);
    } catch (err) {
      lastErr = err;
      const e = err as { code?: string; response?: string; message?: string };
      console.log(`  FAIL: ${e.code || ""} ${e.response || e.message || err}`);
    }
  }
  console.error("\nAll Zoho hosts failed.");
  console.error(lastErr);
  process.exit(1);
}

main();
