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
  const intensiveHref =
    config.intensive.checkoutUrl || config.brand.bookCallUrl;
  const callHref = config.brand.bookCallUrl;
  const price = config.intensive.priceLabel;
  const feedbackBlock = formUrl
    ? `<tr><td style="padding:8px 32px;color:${muted};font-size:14px;line-height:1.6;">
          Two minutes is enough — what worked, what didn’t, and anything you’d change. It helps me make the next plans sharper for people like you.
        </td></tr>
        <tr><td style="padding:12px 32px 8px;">
          <a href="${escapeAttr(
            formUrl
          )}" style="display:inline-block;background:#fff;border:2px solid ${teal};color:${teal};font-family:Poppins,Arial,sans-serif;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;">Share quick feedback →</a>
        </td></tr>`
    : `<tr><td style="padding:8px 32px;color:${muted};font-size:14px;line-height:1.6;">
          Hit reply with a few lines if you want — I read them. And if you’re ready for a clearer next step, choose one below.
        </td></tr>`;

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
        ${feedbackBlock}

        <tr><td style="padding:16px 32px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e8;border:1px solid #f0d48a;border-radius:14px;">
            <tr><td style="padding:20px;">
              <div style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;">${escape(
                price
              )} · Intensive</div>
              <div style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:17px;font-weight:700;margin-top:4px;">${escape(
                config.intensive.name
              )}</div>
              <div style="color:${muted};font-size:14px;line-height:1.6;margin:8px 0 14px;">${escape(
                config.intensive.blurb
              )}</div>
              <a href="${escapeAttr(
                intensiveHref
              )}" style="display:inline-block;background:#e6a324;color:${teal};font-family:Poppins,Arial,sans-serif;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;">Get the Intensive · ${escape(
                price
              )} →</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${teal};border-radius:14px;">
            <tr><td style="padding:20px;">
              <div style="font-family:Poppins,Arial,sans-serif;color:#fff;font-size:17px;font-weight:700;">Or book a free strategy call</div>
              <div style="color:#dbeee7;font-size:14px;line-height:1.6;margin:8px 0 14px;">A free 30-minute Gut Freedom Strategy Call — no pressure, no obligation, just a clear next step if you’re ready.</div>
              <a href="${escapeAttr(
                callHref
              )}" style="display:inline-block;background:#e6a324;color:${teal};font-family:Poppins,Arial,sans-serif;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px;">Book your free call →</a>
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
