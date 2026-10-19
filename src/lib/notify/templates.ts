import { DateTime } from "luxon";
import { formatMoney } from "../money";
import { MODE_LABEL, type Booking, type SiteSettings } from "../types";
import { siteUrl } from "../utils";

export function whenText(startIso: string, tz: string) {
  return DateTime.fromISO(startIso).setZone(tz).toFormat("cccc d LLLL yyyy, h:mm a") + ` (${tz.replace("_", " ")})`;
}

function shell(site: SiteSettings, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#faf7f0;font-family:Georgia,serif;color:#0b3b3c">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-family:Arial,sans-serif;font-size:14px;color:#4b6667;margin:0 0 24px">${site.doctor_name}</p>
<h1 style="font-size:26px;line-height:1.2;margin:0 0 16px">${title}</h1>
<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${body}</div>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#4b6667;margin-top:32px;border-top:1px solid #dcd6c8;padding-top:16px">
This service is for non-emergency advice. If you think you are having a medical emergency, go to the nearest hospital or call your local emergency number.</p>
</div></body></html>`;
}

function details(b: Booking, site: SiteSettings, hostUrl: string) {
  const link = `${siteUrl()}/booking/${b.reference}?t=${b.access_token}`;
  const rows: [string, string][] = [
    ["Consultation", `${b.service_name}, ${b.duration_minutes} minutes`],
    ["When", whenText(b.start_at, site.timezone)],
    ["How", MODE_LABEL[b.meeting_mode]],
    ["Reference", b.reference],
  ];
  if (b.meeting_mode === "meet" && hostUrl) rows.push(["Join link", hostUrl]);
  const html =
    `<table style="border-collapse:collapse;width:100%">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#4b6667;vertical-align:top">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`,
      )
      .join("") +
    `</table><p><a href="${link}" style="color:#b8401c">View your booking</a></p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\nView your booking: ${link}`;
  return { html, text };
}

export function confirmationMessage(b: Booking, site: SiteSettings, meetUrl: string, phoneNote?: string | null) {
  const d = details(b, site, meetUrl);
  const extra =
    b.meeting_mode === "phone"
      ? `I will call you on ${b.patient_phone}.`
      : b.meeting_mode === "whatsapp"
        ? `I will call you on WhatsApp (${b.patient_whatsapp || b.patient_phone}).`
        : "Use the join link at the start time.";
  const note = phoneNote ? ` ${phoneNote}` : "";
  return {
    subject: `Confirmed: ${b.service_name} on ${DateTime.fromISO(b.start_at).setZone(site.timezone).toFormat("d LLL, h:mm a")}`,
    html: shell(
      site,
      `Your consultation is confirmed, ${b.patient_name.split(" ")[0]}`,
      `<p>${extra}${note}</p>${d.html}<p>Need to change the time? Reply to this message or contact me before the session.</p>`,
    ),
    text: `Your consultation is confirmed.\n${extra}${note}\n\n${d.text}`,
  };
}

export function reminderMessage(b: Booking, site: SiteSettings, meetUrl: string, hoursBefore: number) {
  const d = details(b, site, meetUrl);
  const lead = hoursBefore >= 24 ? "tomorrow" : `in about ${hoursBefore} hour${hoursBefore === 1 ? "" : "s"}`;
  return {
    subject: `Reminder: your consultation is ${lead}`,
    html: shell(site, `Your consultation is ${lead}`, d.html),
    text: `Reminder: your consultation is ${lead}.\n\n${d.text}`,
  };
}

export function bankTransferMessage(b: Booking, site: SiteSettings, bank: Record<string, string | undefined>, holdUntil: string) {
  const link = `${siteUrl()}/booking/${b.reference}?t=${b.access_token}`;
  const amount = formatMoney(b.amount_minor, b.currency);
  const lines = [
    `Amount: ${amount}`,
    bank.bank_name && `Bank: ${bank.bank_name}`,
    bank.account_name && `Account name: ${bank.account_name}`,
    bank.account_number && `Account number: ${bank.account_number}`,
    `Use this reference: ${b.reference}`,
  ].filter(Boolean) as string[];
  return {
    subject: `Complete your booking: bank transfer details`,
    html: shell(
      site,
      "Complete your booking",
      `<p>Your time is held until <strong>${whenText(holdUntil, site.timezone)}</strong>. Send the transfer, then confirm on your booking page.</p><p>${lines.join("<br>")}</p><p><a href="${link}" style="color:#b8401c">Open your booking</a></p>`,
    ),
    text: `Your time is held until ${whenText(holdUntil, site.timezone)}.\n\n${lines.join("\n")}\n\nConfirm here: ${link}`,
  };
}

export function summaryMessage(b: Booking, site: SiteSettings, summaryHtml: string, summaryText: string) {
  return {
    subject: `Your consultation summary, ${b.service_name}`,
    html: shell(site, "Your consultation summary", summaryHtml),
    text: `Your consultation summary\n\n${summaryText}`,
  };
}
