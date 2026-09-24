import { config } from "./config";

/** Post-purchase feedback nudge (sent ~48h after buy). */
export function renderFeedbackEmail(firstName: string): string {
  const cream = "#f7f4ec";
  const teal = "#14564a";
  const green = "#2e9e7b";
  const ink = "#22302c";
  const muted = "#5c6b66";
  const name = firstName || "there";
  const formUrl = config.feedback.formUrl.trim();
  const ctaHref = formUrl || config.brand.bookCallUrl;
  const ctaLabel = formUrl
    ? "Share quick feedback →"
    : "Book your free call →";
  const ctaBody = formUrl
    ? "Two minutes is enough — what worked, what didn’t, and anything you’d change. It helps me make the next plans sharper for people like you."
    : "Hit reply with a few lines, or book a free Gut Freedom Strategy Call if you want to go deeper. No pressure — just a clear next step if you’re ready.";

  return `<!doctype html><html><body style="margin:0;background:${cream};padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf7;border-radius:16px;overflow:hidden;border:1px solid #e7e1d3;">
        <tr><td style="height:8px;background:linear-gradient(90deg,${green} 0 33%,#e6a324 33% 66%,#c0492f 66% 100%);"></td></tr>
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;letter-spacing:2px;color:${green};font-weight:700;">GUT FREEDOM · SAMEER DOSSANI</div>
          <h1 style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:24px;margin:8px 0 0;">How’s the plan landing, ${escape(
            name
          )}?</h1>
        </td></tr>
        <tr><td style="padding:8px 32px;color:${ink};font-size:15px;line-height:1.6;">
          It’s been a couple of days since your 7-day Gut Freedom meal plan. I’d love a quick pulse check — what’s feeling easier, what’s still rough, and whether the meals actually fit real life.
        </td></tr>
        <tr><td style="padding:8px 32px;color:${muted};font-size:14px;line-height:1.6;">
          ${escape(ctaBody)}
        </td></tr>
        <tr><td style="padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${teal};border-radius:14px;">
            <tr><td style="padding:24px;">
              <a href="${escapeAttr(ctaHref)}" style="display:inline-block;background:#e6a324;color:${teal};font-family:Poppins,Arial,sans-serif;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;">${escape(
                ctaLabel
              )}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;color:${muted};font-size:11px;line-height:1.6;">
          You’re getting this because you got a personalized meal plan from ${escape(
            config.brand.author
          )}. Reply anytime — I read them.
        </td></tr>
      </table>
      <div style="color:${muted};font-size:11px;padding:16px;">www.sameerdossani.net</div>
    </td></tr>
  </table>
  </body></html>`;
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escape(s).replace(/"/g, "&quot;");
}

/** When the feedback email should fire, given purchase/fulfill time. */
export function feedbackDueAt(
  purchasedAtMs: number,
  delayHours = config.feedback.delayHours
): number {
  const hours = Number.isFinite(delayHours) && delayHours >= 0 ? delayHours : 48;
  return purchasedAtMs + hours * 60 * 60 * 1000;
}
