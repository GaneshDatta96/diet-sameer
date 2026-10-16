import { config } from "./config";

/** Day-7 check-in after meal plan purchase (app cron or Kajabi sequence). */
export function renderDay7Email(firstName: string): string {
  const cream = "#f7f4ec";
  const teal = "#14564a";
  const green = "#2e9e7b";
  const ink = "#22302c";
  const muted = "#5c6b66";
  const name = firstName || "there";
  const intensiveHref =
    config.intensive.checkoutUrl || config.brand.bookCallUrl;
  const callHref = config.brand.bookCallUrl;
  const price = config.intensive.priceLabel;

  return `<!doctype html><html><body style="margin:0;background:${cream};padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf7;border-radius:16px;overflow:hidden;border:1px solid #e7e1d3;">
        <tr><td style="height:8px;background:linear-gradient(90deg,${green} 0 33%,#e6a324 33% 66%,#c0492f 66% 100%);"></td></tr>
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;letter-spacing:2px;color:${green};font-weight:700;">GUT FREEDOM · SAMEER DOSSANI</div>
          <h1 style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:24px;margin:8px 0 0;">Week one in the books, ${escape(
            name
          )}</h1>
        </td></tr>
        <tr><td style="padding:8px 32px;color:${ink};font-size:15px;line-height:1.6;">
          You’ve had about seven days with your Gut Freedom starter plan. By now you’ll know what felt easy, what felt forced, and whether your gut is quieter than it was last week.
        </td></tr>
        <tr><td style="padding:8px 32px;color:${muted};font-size:14px;line-height:1.6;">
          A generic plan can only take you so far. If you want a clearer map — built around how <em>your</em> body responded this week — here are two next steps.
        </td></tr>

        <tr><td style="padding:16px 32px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e8;border:1px solid #f0d48a;border-radius:14px;">
            <tr><td style="padding:20px;">
              <div style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;">${escape(
                price
              )} · Intensive</div>
              <div style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:18px;font-weight:700;margin-top:4px;">${escape(
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
              <div style="color:#dbeee7;font-size:14px;line-height:1.6;margin:8px 0 14px;">A free 30-minute Gut Freedom Strategy Call — no pressure, no obligation. We’ll look at what this week taught you and decide the honest next step together.</div>
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

/** When the Day 7 email should fire, given purchase time. */
export function day7DueAt(
  purchasedAtMs: number,
  delayDays = config.day7.delayDays
): number {
  const days = Number.isFinite(delayDays) && delayDays >= 0 ? delayDays : 7;
  return purchasedAtMs + days * 24 * 60 * 60 * 1000;
}
