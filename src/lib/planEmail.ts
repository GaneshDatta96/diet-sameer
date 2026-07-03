import { config } from "./config";
import { MealPlan } from "./types";

/** Render the plan as email-safe, inline-styled HTML. */
export function renderPlanEmail(plan: MealPlan, firstName: string): string {
  const cream = "#f7f4ec";
  const teal = "#14564a";
  const green = "#2e9e7b";
  const ink = "#22302c";
  const muted = "#5c6b66";

  const daysHtml = plan.days
    .map(
      (day) => `
      <tr><td style="padding:18px 0 6px;">
        <div style="font-family:Poppins,Arial,sans-serif;font-weight:700;color:${teal};font-size:16px;border-bottom:2px solid ${green};padding-bottom:6px;">${escape(
          day.label
        )}</div>
      </td></tr>
      ${day.meals
        .map(
          (m) => `
        <tr><td style="padding:8px 0;">
          <div style="font-size:12px;letter-spacing:1px;color:${green};font-weight:700;text-transform:uppercase;">${escape(
            m.slot
          )}</div>
          <div style="font-size:15px;color:${ink};font-weight:600;">${escape(
            m.title
          )}</div>
          <div style="font-size:14px;color:${muted};">${m.items
            .map(escape)
            .join(" · ")}</div>
          ${
            m.note
              ? `<div style="font-size:12px;color:${muted};font-style:italic;margin-top:2px;">${escape(
                  m.note
                )}</div>`
              : ""
          }
        </td></tr>`
        )
        .join("")}`
    )
    .join("");

  const list = (title: string, items: string[], color: string) => `
    <tr><td style="padding:10px 0;">
      <div style="font-family:Poppins,Arial,sans-serif;font-weight:700;color:${color};font-size:15px;">${escape(
        title
      )}</div>
      <ul style="margin:6px 0 0;padding-left:18px;color:${ink};font-size:14px;">
        ${items.map((i) => `<li style="margin:3px 0;">${escape(i)}</li>`).join("")}
      </ul>
    </td></tr>`;

  return `<!doctype html><html><body style="margin:0;background:${cream};padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${cream};padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf7;border-radius:16px;overflow:hidden;border:1px solid #e7e1d3;">
        <tr><td style="height:8px;background:linear-gradient(90deg,${green} 0 33%,#e6a324 33% 66%,#c0492f 66% 100%);"></td></tr>
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;letter-spacing:2px;color:${green};font-weight:700;">GUT FREEDOM · SAMEER DOSSANI</div>
          <h1 style="font-family:Poppins,Arial,sans-serif;color:${teal};font-size:24px;margin:8px 0 0;">${escape(
            plan.headline
          )}</h1>
        </td></tr>
        <tr><td style="padding:8px 32px;color:${ink};font-size:15px;line-height:1.6;">${escape(
          plan.intro
        )}</td></tr>

        <tr><td style="padding:8px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">${daysHtml}</table>
        </td></tr>

        <tr><td style="padding:8px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${list("🟢 Your green foundation", plan.greenFoundation, green)}
            ${list("🟡 Test carefully", plan.testCarefully, "#c88a12")}
            ${list("🔴 Skip for now", plan.skipForNow, "#c0492f")}
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px;color:${ink};font-size:14px;line-height:1.6;">
          <strong style="color:${teal};">Salt &amp; water:</strong> ${escape(
            plan.hydrationAndSalt
          )}
        </td></tr>

        <tr><td style="padding:8px 32px;">
          <div style="font-family:Poppins,Arial,sans-serif;font-weight:700;color:${teal};font-size:15px;margin-bottom:6px;">A few notes just for you, ${escape(
            firstName
          )}</div>
          ${plan.personalNotes
            .map(
              (n) =>
                `<div style="color:${muted};font-size:14px;line-height:1.6;margin:6px 0;">${escape(
                  n
                )}</div>`
            )
            .join("")}
        </td></tr>

        <tr><td style="padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:${teal};border-radius:14px;">
            <tr><td style="padding:24px;">
              <div style="font-family:Poppins,Arial,sans-serif;color:#fff;font-size:19px;font-weight:700;">Ready to draw <span style="color:#e6a324;">your</span> map?</div>
              <div style="color:#dbeee7;font-size:14px;line-height:1.6;margin:8px 0 16px;">This plan is a generic starting point. When you're ready for a plan built around your body, your history and your labs — with me guiding you the whole way — let's talk. A free 30-minute Gut Freedom Strategy Call: no pressure, no obligation, just a clear next step.</div>
              <a href="${config.brand.bookCallUrl}" style="display:inline-block;background:#e6a324;color:${teal};font-family:Poppins,Arial,sans-serif;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;">Book your free call →</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px 28px;color:${muted};font-size:11px;line-height:1.6;font-style:italic;border-top:1px solid #e7e1d3;">
          ${escape(plan.disclaimer)}
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
