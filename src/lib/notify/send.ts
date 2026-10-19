import "server-only";
import { getSecret } from "../secrets";
import { createAdminClient } from "../supabase/admin";
import type { PrivateSettings } from "../types";

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const [key, from] = await Promise.all([getSecret("resend_api_key"), getSecret("email_from")]);
  if (!key || !from) return { ok: false as const, reason: "Email is not configured." };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) return { ok: false as const, reason: `Email provider replied ${res.status}.` };
  return { ok: true as const };
}

/** Digits only, with a Nigerian 0-prefix converted to +234 form. */
export function normalizePhone(raw: string) {
  const d = raw.replace(/[^\d]/g, "");
  if (d.startsWith("0") && d.length === 11) return `234${d.slice(1)}`;
  return d;
}

export async function sendWhatsApp(to: string, message: string) {
  const [token, phoneId, template] = await Promise.all([
    getSecret("whatsapp_token"),
    getSecret("whatsapp_phone_id"),
    getSecret("whatsapp_template"),
  ]);
  if (!token || !phoneId) return { ok: false as const, reason: "WhatsApp is not configured." };
  // Messages we start ourselves must use an approved template (one body
  // variable). Free-form text only works inside a 24 hour reply window.
  const body = template
    ? {
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: message.replace(/\s*\n\s*/g, " | ").slice(0, 900) }] }],
        },
      }
    : { messaging_product: "whatsapp", to: normalizePhone(to), type: "text", text: { body: message } };
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false as const, reason: `WhatsApp replied ${res.status}.` };
  return { ok: true as const };
}

/** Sends over each enabled channel. Failures are logged, never thrown, so a
 * broken email key can never block a paid booking from confirming. */
export async function notifyPatient(
  settings: Pick<PrivateSettings, "notify">,
  patient: { email: string; whatsapp: string | null; phone: string },
  msg: { subject: string; html: string; text: string },
) {
  const jobs: Promise<unknown>[] = [];
  if (settings.notify.email) jobs.push(sendEmail(patient.email, msg.subject, msg.html, msg.text));
  if (settings.notify.whatsapp) jobs.push(sendWhatsApp(patient.whatsapp || patient.phone, msg.text));
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") console.error("notify failed", r.reason);
    else if (r.value && typeof r.value === "object" && "ok" in r.value && !(r.value as { ok: boolean }).ok) {
      console.warn("notify skipped", (r.value as { reason?: string }).reason);
    }
  }
}

export async function notifyDoctor(subject: string, text: string) {
  const db = createAdminClient();
  const { data } = await db.from("site_settings").select("contact_email").eq("id", 1).maybeSingle();
  if (!data?.contact_email) return;
  await sendEmail(data.contact_email, subject, `<p>${text.replace(/\n/g, "<br>")}</p>`, text).catch(() => {});
}
