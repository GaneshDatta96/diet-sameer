import nodemailer from "nodemailer";
import { config } from "./config";
import { renderFeedbackEmail } from "./feedbackEmail";
import { renderPlanEmail } from "./planEmail";
import { MealPlan } from "./types";

interface SendPlanArgs {
  to: string;
  firstName: string;
  plan: MealPlan;
  /** When set, Resend holds the email until this time (epoch ms). SMTP sends immediately. */
  scheduledAt?: number;
}

interface SendFeedbackArgs {
  to: string;
  firstName: string;
  /** When set, Resend holds until this time. SMTP ignores (cron sends later). */
  scheduledAt?: number;
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; id?: string }> {
  const smtp = config.smtp;
  if (!smtp) return { ok: false };

  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      family: 4,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const info = await transport.sendMail({
      from: smtp.from,
      to,
      subject,
      html,
    });

    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error("[email] smtp failed:", err);
    return { ok: false };
  }
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  scheduledAt?: number
): Promise<{ ok: boolean; id?: string }> {
  const body: Record<string, unknown> = {
    from: config.resend.from,
    to,
    subject,
    html,
  };
  if (scheduledAt && scheduledAt > Date.now()) {
    body.scheduled_at = new Date(scheduledAt).toISOString();
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.resend.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("[email] resend failed:", res.status, await res.text());
    return { ok: false };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id };
}

/**
 * Send or schedule the finished plan.
 * Priority: SMTP/Gmail → Resend → console mock (dev only).
 * On Vercel, missing email config is a hard error so we never pretend we sent.
 */
export async function sendPlanEmail({
  to,
  firstName,
  plan,
  scheduledAt,
}: SendPlanArgs): Promise<{ ok: boolean; id?: string }> {
  const subject = `${firstName ? firstName + ", your" : "Your"} 7-Day Gut Freedom plan is ready`;
  const html = renderPlanEmail(plan, firstName || "there");

  if (config.smtp) {
    console.log(`[email] sending via SMTP (${config.smtp.host}) → ${to}`);
    return sendViaSmtp(to, subject, html);
  }

  if (config.resend.enabled) {
    console.log(`[email] sending via Resend → ${to}`);
    return sendViaResend(to, subject, html, scheduledAt);
  }

  if (process.env.VERCEL === "1") {
    console.error(
      "[email] Missing mail config on Vercel. Set SMTP_* (or RESEND_API_KEY)."
    );
    return { ok: false };
  }

  console.log(
    `\n[email:mock] To: ${to}\n[email:mock] Subject: ${subject}\n[email:mock] (Set SMTP_* to actually send. HTML length: ${html.length})\n`
  );
  return { ok: true, id: "mock" };
}

/** Send or schedule the 48h post-purchase feedback email. */
export async function sendFeedbackEmail({
  to,
  firstName,
  scheduledAt,
}: SendFeedbackArgs): Promise<{ ok: boolean; id?: string; deferred?: boolean }> {
  const subject = firstName
    ? `${firstName}, quick check-in on your Gut Freedom plan`
    : "Quick check-in on your Gut Freedom plan";
  const html = renderFeedbackEmail(firstName || "there");

  // SMTP cannot schedule — caller should wait until due (cron).
  if (config.smtp) {
    if (scheduledAt && scheduledAt > Date.now()) {
      return { ok: true, deferred: true };
    }
    console.log(`[email] feedback via SMTP (${config.smtp.host}) → ${to}`);
    return sendViaSmtp(to, subject, html);
  }

  if (config.resend.enabled) {
    console.log(`[email] feedback via Resend → ${to}`);
    return sendViaResend(to, subject, html, scheduledAt);
  }

  if (process.env.VERCEL === "1") {
    console.error("[email] Missing mail config for feedback send.");
    return { ok: false };
  }

  console.log(
    `\n[email:mock] feedback To: ${to}\n[email:mock] Subject: ${subject}\n`
  );
  return { ok: true, id: "mock-feedback" };
}
