"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { RichEditor, type EditorValue } from "@/components/editor/rich-editor";
import {
  removeSecret,
  saveBookingRules,
  saveNotifications,
  savePayments,
  saveProfile,
  saveSecrets,
  type ActionResult,
} from "@/app/dashboard/actions";
import { uploadMedia } from "@/lib/upload";
import { SECRET_KEYS, type SecretKey } from "@/lib/secrets-meta";
import type { PrivateSettings, SiteSettings } from "@/lib/types";

function useSave() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      r.ok ? toast.success(r.message ?? "Saved") : toast.error(r.error);
    });
  return { pending, run };
}

function SaveButton({ pending, children = "Save changes" }: { pending: boolean; children?: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null} {children}
    </Button>
  );
}

/** Repeating group of small forms (credentials, experience, ...). */
function ListEditor<T extends Record<string, string>>({
  label,
  items,
  onChange,
  fields,
  blank,
}: {
  label: string;
  items: T[];
  onChange: (v: T[]) => void;
  fields: { key: keyof T & string; label: string; long?: boolean }[];
  blank: T;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 font-display text-xl font-semibold">{label}</legend>
      {items.map((it, i) => (
        <div key={i} className="grid gap-3 rounded-xl border p-4">
          {fields.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`${label}-${i}-${f.key}`} className="text-sm">{f.label}</Label>
              {f.long ? (
                <Textarea id={`${label}-${i}-${f.key}`} rows={3} value={it[f.key]} onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, [f.key]: e.target.value } : x)))} />
              ) : (
                <Input id={`${label}-${i}-${f.key}`} value={it[f.key]} onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, [f.key]: e.target.value } : x)))} />
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive" onClick={() => onChange(items.filter((_, xi) => xi !== i))}>
            <Trash2 /> Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-fit" onClick={() => onChange([...items, { ...blank }])}>
        <Plus /> Add
      </Button>
    </fieldset>
  );
}

const SOCIALS = ["instagram", "youtube", "tiktok", "facebook", "linkedin", "x"] as const;

export function ProfileForm({ site }: { site: SiteSettings }) {
  const { pending, run } = useSave();
  const [s, setS] = useState({
    ...site,
    mdcn_number: site.mdcn_number ?? "",
    photo_url: site.photo_url ?? "",
    contact_email: site.contact_email ?? "",
    phone: site.phone ?? "",
    whatsapp_number: site.whatsapp_number ?? "",
    location: site.location ?? "",
    seo_description: site.seo_description ?? "",
  });
  const about = useRef<EditorValue>({ html: site.about_html, json: null });
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));
  const text = (k: keyof typeof s, label: string, opts: { hint?: string; long?: boolean; type?: string } = {}) => (
    <Field label={label} htmlFor={`p-${k}`} hint={opts.hint}>
      {opts.long ? (
        <Textarea id={`p-${k}`} rows={3} value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <Input id={`p-${k}`} type={opts.type} value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      )}
    </Field>
  );

  return (
    <form
      className="grid max-w-3xl gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          saveProfile({
            ...s,
            about_html: about.current.html,
            mdcn_number: s.mdcn_number || null,
            photo_url: s.photo_url || null,
            contact_email: s.contact_email || null,
            phone: s.phone || null,
            whatsapp_number: s.whatsapp_number || null,
            location: s.location || null,
            seo_description: s.seo_description || null,
          }),
        );
      }}
    >
      <section className="grid gap-5">
        <h3 className="font-display text-xl font-semibold">Who you are</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("doctor_name", "Full name")}
          {text("short_name", "Short name", { hint: "Used in greetings and the header" })}
          {text("post_nominals", "Letters after your name", { hint: "For example MBBS" })}
          {text("mdcn_number", "Licence number (optional)")}
        </div>
        {text("specialty", "Specialty line")}
        {text("headline", "Headline on the home page")}
        {text("tagline", "Short line under the headline", { long: true })}
        {text("short_bio", "Short bio", { long: true, hint: "A few sentences shown on the home page" })}
        <div className="grid gap-2">
          <Label>Photo</Label>
          <div className="flex flex-wrap items-center gap-3">
            {s.photo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.photo_url} alt="" className="size-16 rounded-full object-cover" />}
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold hover:bg-mint-50">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Upload photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  try {
                    set("photo_url", await uploadMedia(f, "profile"));
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        <h3 className="font-display text-xl font-semibold">About page</h3>
        <RichEditor initialHtml={site.about_html} onChange={(v) => (about.current = v)} folder="about" minHeight="18rem" />
        <ListEditor label="Credentials and awards" items={s.credentials} onChange={(v) => set("credentials", v)} fields={[{ key: "title", label: "Title" }, { key: "detail", label: "Detail" }]} blank={{ title: "", detail: "" }} />
        <ListEditor label="Experience" items={s.experience} onChange={(v) => set("experience", v)} fields={[{ key: "role", label: "Role" }, { key: "place", label: "Place" }, { key: "period", label: "Period" }, { key: "summary", label: "Summary", long: true }]} blank={{ role: "", place: "", period: "", summary: "" }} />
        <ListEditor label="Education and training" items={s.education} onChange={(v) => set("education", v)} fields={[{ key: "title", label: "Qualification" }, { key: "place", label: "Institution" }, { key: "year", label: "Year" }]} blank={{ title: "", place: "", year: "" }} />
        <ListEditor label="Areas of interest" items={s.interests} onChange={(v) => set("interests", v)} fields={[{ key: "title", label: "Title" }, { key: "detail", label: "Detail" }]} blank={{ title: "", detail: "" }} />
        <ListEditor label="Approach to care" items={s.approach} onChange={(v) => set("approach", v)} fields={[{ key: "title", label: "Title" }, { key: "detail", label: "Detail" }]} blank={{ title: "", detail: "" }} />
        <Field label="Speaking and engagements" htmlFor="p-eng" hint="One per line">
          <Textarea id="p-eng" rows={5} value={s.engagements.join("\n")} onChange={(e) => set("engagements", e.target.value.split("\n").filter((l) => l.trim()))} />
        </Field>
      </section>

      <section className="grid gap-5">
        <h3 className="font-display text-xl font-semibold">Contact and links</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("contact_email", "Email for booking alerts", { type: "email" })}
          {text("location", "Location")}
          {text("phone", "Phone number")}
          {text("whatsapp_number", "WhatsApp number")}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIALS.map((k) => (
            <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} link`} htmlFor={`soc-${k}`}>
              <Input id={`soc-${k}`} inputMode="url" value={s.socials[k] ?? ""} onChange={(e) => set("socials", { ...s.socials, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        {text("seo_description", "Site description for search engines", { long: true })}
        {text("timezone", "Your time zone", { hint: "For example Africa/Lagos. Your hours and bookings use this." })}
      </section>

      <div><SaveButton pending={pending} /></div>
    </form>
  );
}

export function BookingRulesForm({ priv }: { priv: PrivateSettings }) {
  const { pending, run } = useSave();
  const [v, setV] = useState({
    slot_interval_minutes: String(priv.slot_interval_minutes),
    buffer_minutes: String(priv.buffer_minutes),
    min_notice_hours: String(priv.min_notice_hours),
    max_advance_days: String(priv.max_advance_days),
    hold_minutes: String(priv.hold_minutes),
    bank_hold_hours: String(priv.bank_hold_hours),
    default_meet_url: priv.default_meet_url ?? "",
    phone_instructions: priv.phone_instructions ?? "",
  });
  const num = (k: keyof typeof v, label: string, hint: string) => (
    <Field label={label} htmlFor={`r-${k}`} hint={hint}>
      <Input id={`r-${k}`} type="number" min={0} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </Field>
  );
  return (
    <form
      className="grid max-w-3xl gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          saveBookingRules({
            slot_interval_minutes: Number(v.slot_interval_minutes),
            buffer_minutes: Number(v.buffer_minutes),
            min_notice_hours: Number(v.min_notice_hours),
            max_advance_days: Number(v.max_advance_days),
            hold_minutes: Number(v.hold_minutes),
            bank_hold_hours: Number(v.bank_hold_hours),
            default_meet_url: v.default_meet_url || null,
            phone_instructions: v.phone_instructions || null,
          }),
        );
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {num("slot_interval_minutes", "Start times every (minutes)", "15 offers 9:00, 9:15, 9:30")}
        {num("buffer_minutes", "Gap after each consultation (minutes)", "Rest time between patients")}
        {num("min_notice_hours", "Earliest booking (hours ahead)", "Stops last-minute bookings")}
        {num("max_advance_days", "Furthest booking (days ahead)", "How far into the future")}
        {num("hold_minutes", "Hold a slot while a patient pays (minutes)", "Card or online payment")}
        {num("bank_hold_hours", "Hold a slot for bank transfer (hours)", "Time to send the transfer")}
      </div>
      <Field label="Your Google Meet link" htmlFor="r-meet" hint="Create a Meet room with a permanent link and paste it here. Patients get it after payment. You can override it per consultation.">
        <Input id="r-meet" inputMode="url" value={v.default_meet_url} onChange={(e) => setV({ ...v, default_meet_url: e.target.value })} placeholder="https://meet.google.com/abc-defg-hij" />
      </Field>
      <Field label="Message for phone and WhatsApp calls" htmlFor="r-phone" hint="Shown to the patient, for example which number you will call from.">
        <Textarea id="r-phone" rows={3} value={v.phone_instructions} onChange={(e) => setV({ ...v, phone_instructions: e.target.value })} />
      </Field>
      <div><SaveButton pending={pending} /></div>
    </form>
  );
}

function SecretField({ k, status, onChanged }: { k: SecretKey; status: { saved: boolean; hint: string | null }; onChanged: () => void }) {
  const meta = SECRET_KEYS[k];
  const [val, setVal] = useState("");
  const { pending, run } = useSave();
  const secretish = !/email_from|phone_id|template/.test(k);
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`k-${k}`}>{meta.label}</Label>
        {status.saved && <Badge variant="success"><Check className="size-3" /> Saved{status.hint ? ` ${status.hint}` : ""}</Badge>}
      </div>
      <div className="flex gap-2">
        <Input
          id={`k-${k}`}
          type={secretish ? "password" : "text"}
          autoComplete="off"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={status.saved ? "Enter a new value to replace it" : meta.placeholder}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending || !val.trim()}
          onClick={() => run(async () => {
            const r = await saveSecrets({ [k]: val });
            if (r.ok) {
              setVal("");
              onChanged();
            }
            return r;
          })}
        >
          Save
        </Button>
        {status.saved && (
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${meta.label}`} disabled={pending} onClick={() => run(async () => {
            const r = await removeSecret(k);
            if (r.ok) onChanged();
            return r;
          })}>
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}

export function PaymentsForm({
  priv,
  secrets,
  webhookBase,
  refresh,
}: {
  priv: PrivateSettings;
  secrets: Record<SecretKey, { saved: boolean; hint: string | null }>;
  webhookBase: string;
  refresh: () => void;
}) {
  const { pending, run } = useSave();
  const [pay, setPay] = useState(priv.payments);
  const [bank, setBank] = useState({ bank_name: "", account_name: "", account_number: "", note: "", ...priv.bank_details });
  const card = (id: keyof typeof pay, title: string, blurb: string, children?: React.ReactNode) => (
    <section className="grid gap-4 rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`pay-${id}`} className="text-sm font-normal">{pay[id] ? "On" : "Off"}</Label>
          <Switch id={`pay-${id}`} checked={pay[id]} onCheckedChange={(v) => setPay({ ...pay, [id]: v })} />
        </div>
      </div>
      {children}
    </section>
  );
  return (
    <div className="grid max-w-3xl gap-6">
      {card("paystack", "Paystack", "Cards, bank and USSD. Best for patients in Nigeria.", (
        <>
          <SecretField k="paystack_secret" status={secrets.paystack_secret} onChanged={refresh} />
          <p className="text-sm text-muted-foreground">
            In Paystack, set the webhook URL to <code className="rounded bg-mint-100 px-1.5 py-0.5">{webhookBase}/api/webhooks/paystack</code>. Charging in dollars needs USD enabled on your Paystack account.
          </p>
        </>
      ))}
      {card("flutterwave", "Flutterwave", "Cards and bank payments in naira or dollars.", (
        <>
          <SecretField k="flutterwave_secret" status={secrets.flutterwave_secret} onChanged={refresh} />
          <SecretField k="flutterwave_webhook_hash" status={secrets.flutterwave_webhook_hash} onChanged={refresh} />
          <p className="text-sm text-muted-foreground">
            In Flutterwave, set the webhook URL to <code className="rounded bg-mint-100 px-1.5 py-0.5">{webhookBase}/api/webhooks/flutterwave</code> and use the same secret hash as above.
          </p>
        </>
      ))}
      {card("bank_transfer", "Bank transfer", "Patients in Nigeria pay by transfer and you confirm it. Shown in naira only.", (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank" htmlFor="b-bank"><Input id="b-bank" value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} /></Field>
          <Field label="Account name" htmlFor="b-name"><Input id="b-name" value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} /></Field>
          <Field label="Account number" htmlFor="b-num"><Input id="b-num" inputMode="numeric" value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} /></Field>
          <Field label="Note to patients" htmlFor="b-note"><Input id="b-note" value={bank.note} onChange={(e) => setBank({ ...bank, note: e.target.value })} /></Field>
        </div>
      ))}
      <div>
        <Button disabled={pending} onClick={() => run(() => savePayments({ payments: pay, bank_details: bank }))}>
          {pending ? <Loader2 className="animate-spin" /> : null} Save payment settings
        </Button>
      </div>
    </div>
  );
}

export function NotificationsForm({
  priv,
  secrets,
  refresh,
}: {
  priv: PrivateSettings;
  secrets: Record<SecretKey, { saved: boolean; hint: string | null }>;
  refresh: () => void;
}) {
  const { pending, run } = useSave();
  const [email, setEmail] = useState(priv.notify.email);
  const [wa, setWa] = useState(priv.notify.whatsapp);
  const [hours, setHours] = useState(priv.notify.reminder_hours.join(", "));
  return (
    <div className="grid max-w-3xl gap-6">
      <section className="grid gap-5 rounded-2xl border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Reminders</h3>
        <div className="flex items-center gap-3"><Switch id="n-email" checked={email} onCheckedChange={setEmail} /><Label htmlFor="n-email">Send email confirmations and reminders</Label></div>
        <div className="flex items-center gap-3"><Switch id="n-wa" checked={wa} onCheckedChange={setWa} /><Label htmlFor="n-wa">Send WhatsApp confirmations and reminders</Label></div>
        <Field label="Remind patients this many hours before" htmlFor="n-hours" hint="Separate with commas, for example 24, 1">
          <Input id="n-hours" value={hours} onChange={(e) => setHours(e.target.value)} />
        </Field>
        <div>
          <Button
            disabled={pending}
            onClick={() =>
              run(() =>
                saveNotifications({
                  email,
                  whatsapp: wa,
                  reminder_hours: hours.split(",").map((h) => Number(h.trim())).filter((n) => Number.isFinite(n) && n > 0),
                }),
              )
            }
          >
            Save reminders
          </Button>
        </div>
      </section>
      <section className="grid gap-5 rounded-2xl border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Email (Resend)</h3>
        <SecretField k="resend_api_key" status={secrets.resend_api_key} onChanged={refresh} />
        <SecretField k="email_from" status={secrets.email_from} onChanged={refresh} />
      </section>
      <section className="grid gap-5 rounded-2xl border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">WhatsApp (Cloud API)</h3>
        <SecretField k="whatsapp_token" status={secrets.whatsapp_token} onChanged={refresh} />
        <SecretField k="whatsapp_phone_id" status={secrets.whatsapp_phone_id} onChanged={refresh} />
        <SecretField k="whatsapp_template" status={secrets.whatsapp_template} onChanged={refresh} />
        <p className="text-sm text-muted-foreground">WhatsApp only lets businesses start a conversation with an approved message template. Create one in Meta Business Manager with one text variable, and enter its name above.</p>
      </section>
    </div>
  );
}
