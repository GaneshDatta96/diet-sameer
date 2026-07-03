import { config } from "./config";
import { renderPlanEmail } from "./planEmail";
import { MealPlan } from "./types";

interface SendPlanArgs {
  to: string;
  firstName: string;
  plan: MealPlan;
}

/**
 * Send the finished plan. Uses Resend when RESEND_API_KEY is set; otherwise
 * logs to the server console so the flow is fully testable without a provider.
 */
export async function sendPlanEmail({
  to,
  firstName,
  plan,
}: SendPlanArgs): Promise<{ ok: boolean; id?: string }> {
  const subject = `${firstName ? firstName + ", your" : "Your"} 7-Day Gut Freedom plan is ready`;
  const html = renderPlanEmail(plan, firstName || "there");

  if (!config.resend.enabled) {
    console.log(
      `\n[email:mock] To: ${to}\n[email:mock] Subject: ${subject}\n[email:mock] (Set RESEND_API_KEY to actually send. HTML length: ${html.length})\n`
    );
    return { ok: true, id: "mock" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.resend.apiKey}`,
    },
    body: JSON.stringify({
      from: config.resend.from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("[email] resend failed:", res.status, await res.text());
    return { ok: false };
  }
  const data = await res.json();
  return { ok: true, id: data.id };
}
