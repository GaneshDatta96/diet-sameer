import nodemailer from "nodemailer";
import { config } from "./config";
import { renderPlanEmail } from "./planEmail";
import { MealPlan } from "./types";

interface SendPlanArgs {
  to: string;
  firstName: string;
  plan: MealPlan;
  /** When set, Resend holds the email until this time (epoch ms). Gmail sends immediately. */
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
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

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

/**
 * Send or schedule the finished plan.
 * Priority: Gmail (test) → Resend → console mock.
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
    return sendViaSmtp(to, subject, html);
  }

  if (!config.resend.enabled) {
    const delay = scheduledAt ? Math.max(0, scheduledAt - Date.now()) : 0;
    const send = () => {
      console.log(
        `\n[email:mock] To: ${to}\n[email:mock] Subject: ${subject}\n[email:mock] (Set GMAIL_USER + GMAIL_APP_PASSWORD, GMAIL_ACCOUNTS_JSON, or RESEND_API_KEY to send. HTML length: ${html.length})\n`
      );
    };
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      console.log(`[email:mock] Scheduling delivery in ${Math.round(delay / 1000)}s`);
      setTimeout(send, delay);
    } else {
      send();
    }
    return { ok: true, id: "mock" };
  }

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
