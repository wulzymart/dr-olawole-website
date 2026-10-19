"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays, Clock, Loader2, Lock, MessageCircle, Phone, Video } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSlots, submitBooking } from "@/app/actions/booking";
import { formatMoney, priceFor } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Currency, MeetingMode, PaymentMethod, Service } from "@/lib/types";

const MODE_META: Record<MeetingMode, { label: string; hint: string; icon: typeof Video }> = {
  meet: { label: "Video call", hint: "Google Meet link by email", icon: Video },
  phone: { label: "Phone call", hint: "I call the number you give", icon: Phone },
  whatsapp: { label: "WhatsApp call", hint: "I call you on WhatsApp", icon: MessageCircle },
};
const METHOD_META: Record<PaymentMethod, { label: string; hint: string }> = {
  paystack: { label: "Card, bank or USSD", hint: "Secure checkout by Paystack" },
  flutterwave: { label: "Card or bank account", hint: "Secure checkout by Flutterwave" },
  bank_transfer: { label: "Bank transfer", hint: "Send to my account, then confirm here" },
  free: { label: "", hint: "" },
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function keyInZone(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function timeInZone(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).toUpperCase();
}
function longDay(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

interface Props {
  services: Service[];
  currency: Currency;
  methods: PaymentMethod[];
  initialSlug?: string;
  doctorName: string;
}

export function BookingWizard({ services, currency, methods, initialSlug, doctorName }: Props) {
  const initial = services.find((s) => s.slug === initialSlug) ?? services[0];
  const [serviceId, setServiceId] = useState(initial?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const [mode, setMode] = useState<MeetingMode>(initial?.modes[0] ?? "meet");
  const [tz, setTz] = useState("Africa/Lagos");
  const [month, setMonth] = useState(() => new Date());
  const [slotsByDay, setSlotsByDay] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod | undefined>(methods[0]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", whatsapp: "", reason: "" });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const reqId = useRef(0);

  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos");
  }, []);

  const price = service ? priceFor(service, currency) : null;
  const isFree = price?.minor === 0;

  // Load open times for the visible month, then group them by the patient's own calendar day.
  const loadMonth = useCallback(
    async (m: Date, id: string, zone: string) => {
      if (!id) return;
      const my = ++reqId.current;
      setLoadingSlots(true);
      const first = new Date(m.getFullYear(), m.getMonth(), 1);
      const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      const pad = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
      const { slots } = await getSlots({ serviceId: id, from: dayKey(pad(first, -1)), to: dayKey(pad(last, 1)) });
      if (my !== reqId.current) return;
      const grouped: Record<string, string[]> = {};
      for (const iso of Object.values(slots).flat()) (grouped[keyInZone(iso, zone)] ??= []).push(iso);
      for (const k of Object.keys(grouped)) grouped[k].sort();
      setSlotsByDay(grouped);
      setLoadingSlots(false);
    },
    [],
  );

  useEffect(() => {
    loadMonth(month, serviceId, tz);
  }, [month, serviceId, tz, loadMonth]);

  function chooseService(s: Service) {
    setServiceId(s.id);
    if (!s.modes.includes(mode)) setMode(s.modes[0]);
    setStart(null);
    setDay(null);
  }

  const dayTimes = day ? (slotsByDay[day] ?? []) : [];
  const todayKey = dayKey(new Date());
  const hasSlots = (d: Date) => (slotsByDay[dayKey(d)]?.length ?? 0) > 0;

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!service) next.service = "Choose a consultation.";
    if (!start) next.start = "Choose a day and time.";
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 7) next.phone = "Enter a phone number we can reach.";
    if (!isFree && !method) next.method = "Choose how you would like to pay.";
    if (!consent) next.consent = "Please accept to continue.";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      document.getElementById(first === "service" || first === "start" ? "step-time" : first)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    startTransition(async () => {
      const res = await submitBooking({
        serviceId,
        start,
        mode,
        method: isFree ? undefined : method,
        name: form.name,
        email: form.email,
        phone: form.phone,
        whatsapp: form.whatsapp,
        reason: form.reason,
        timezone: tz,
        consent,
      });
      if (res.ok) {
        window.location.assign(res.redirect);
        return;
      }
      toast.error(res.error);
      if (res.field) setErrors((er) => ({ ...er, [res.field!]: res.error }));
      if (res.field === "start") {
        setStart(null);
        loadMonth(month, serviceId, tz);
      }
    });
  }

  if (services.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Bookings are not open yet. Please check back soon.</p>;
  }
  if (!isFree && methods.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
        Online payment is being set up. Please contact {doctorName} directly to arrange a consultation.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <div className="grid gap-14">
        {/* 1. Consultation */}
        <section aria-labelledby="h-service">
          <StepHeading n={1} id="h-service">Choose a consultation</StepHeading>
          <div className="mt-6 grid gap-3" role="radiogroup" aria-labelledby="h-service">
            {services.map((s) => {
              const p = priceFor(s, currency);
              const on = s.id === serviceId;
              return (
                <button
                  type="button"
                  key={s.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => chooseService(s)}
                  className={cn(
                    "flex cursor-pointer items-center gap-5 rounded-2xl border-2 bg-white p-5 text-left transition-colors",
                    on ? "border-pine-900 bg-mint-50 shadow-soft" : "border-border hover:border-pine-700/50",
                  )}
                >
                  <span className="w-20 shrink-0 font-display text-4xl font-medium leading-none tracking-tight text-pine-800">
                    {s.duration_minutes}
                    <span className="ml-0.5 text-sm text-muted-foreground">min</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-semibold leading-snug">{s.name}</span>
                    <span className="block text-sm text-muted-foreground">{s.summary}</span>
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(p.minor, p.currency)}</span>
                </button>
              );
            })}
          </div>

          {service && service.modes.length > 1 && (
            <fieldset className="mt-6">
              <legend className="mb-3 text-sm font-semibold">How would you like to meet?</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {service.modes.map((m) => {
                  const meta = MODE_META[m];
                  const on = mode === m;
                  return (
                    <label
                      key={m}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-coral-400/30",
                        on ? "border-pine-900 bg-mint-50" : "border-border hover:border-pine-700/50",
                      )}
                    >
                      <input type="radio" name="mode" value={m} checked={on} onChange={() => setMode(m)} className="sr-only" />
                      <meta.icon className="mt-0.5 size-5 shrink-0 text-pine-700" />
                      <span className="leading-snug">
                        <span className="block font-semibold">{meta.label}</span>
                        <span className="block text-sm text-muted-foreground">{meta.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </section>

        {/* 2. Time */}
        <section id="step-time" aria-labelledby="h-time" className="scroll-mt-28">
          <StepHeading n={2} id="h-time">Pick a day and time</StepHeading>
          <p className="mt-2 text-sm text-muted-foreground">Times are shown in your time zone ({tz.replace("_", " ")}).</p>
          <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 [--rdp-accent-color:var(--pine-900)] [--rdp-accent-background-color:var(--mint-200)] [--rdp-day-height:2.75rem] [--rdp-day-width:2.75rem]">
              <DayPicker
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={day ? new Date(`${day}T12:00:00`) : undefined}
                onSelect={(d) => {
                  if (!d) return;
                  setDay(dayKey(d));
                  setStart(null);
                }}
                disabled={(d) => dayKey(d) < todayKey || !hasSlots(d)}
                startMonth={new Date()}
                weekStartsOn={1}
              />
              {loadingSlots && <p className="px-3 pb-2 text-sm text-muted-foreground" aria-live="polite">Checking availability…</p>}
            </div>
            <div aria-live="polite">
              {!day && <p className="text-muted-foreground">Choose a highlighted day to see open times.</p>}
              {day && dayTimes.length === 0 && <p className="text-muted-foreground">No times left on this day. Please pick another.</p>}
              {day && dayTimes.length > 0 && (
                <>
                  <p className="font-display text-xl font-semibold">{longDay(dayTimes[0], tz)}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {dayTimes.map((iso) => (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => {
                          setStart(iso);
                          setErrors((e) => ({ ...e, start: "" }));
                        }}
                        aria-pressed={start === iso}
                        className={cn(
                          "h-11 cursor-pointer rounded-lg border-2 text-sm font-semibold tabular-nums transition-colors",
                          start === iso ? "border-pine-900 bg-pine-900 text-cream" : "border-border bg-white hover:border-pine-700",
                        )}
                      >
                        {timeInZone(iso, tz)}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {errors.start && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{errors.start}</p>}
            </div>
          </div>
        </section>

        {/* 3. Details */}
        <section aria-labelledby="h-details">
          <StepHeading n={3} id="h-details">Your details</StepHeading>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={errors.name} className="sm:col-span-2">
              <Input id="name" name="name" autoComplete="name" value={form.name} onChange={(e) => setField("name", e.target.value)} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email} hint="Your confirmation and summary are sent here.">
              <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => setField("email", e.target.value)} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Phone number" htmlFor="phone" error={errors.phone} hint="Include the country code if outside Nigeria.">
              <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} aria-invalid={!!errors.phone} />
            </Field>
            {mode === "whatsapp" && (
              <Field label="WhatsApp number (if different)" htmlFor="whatsapp" className="sm:col-span-2">
                <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} />
              </Field>
            )}
            <Field label="What would you like to talk about? (optional)" htmlFor="reason" className="sm:col-span-2" hint="A few lines help me prepare. Please do not share anything you are not comfortable writing down.">
              <Textarea id="reason" name="reason" value={form.reason} maxLength={1500} onChange={(e) => setField("reason", e.target.value)} />
            </Field>
          </div>
        </section>

        {/* 4. Payment */}
        {!isFree && (
          <section aria-labelledby="h-pay">
            <StepHeading n={4} id="h-pay">Payment</StepHeading>
            <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="h-pay" id="method">
              {methods.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-coral-400/30",
                    method === m ? "border-pine-900 bg-mint-50" : "border-border hover:border-pine-700/50",
                  )}
                >
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                  <Lock className="mt-0.5 size-5 shrink-0 text-pine-700" />
                  <span className="leading-snug">
                    <span className="block font-semibold">{METHOD_META[m].label}</span>
                    <span className="block text-sm text-muted-foreground">{METHOD_META[m].hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors.method && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{errors.method}</p>}
          </section>
        )}

        <div className="grid gap-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => { setConsent(v === true); setErrors((e) => ({ ...e, consent: "" })); }} aria-invalid={!!errors.consent} className="mt-0.5" />
            <span>
              I understand this is a non-emergency online consultation, and I agree to the <Link href="/terms" className="underline underline-offset-2" target="_blank">terms</Link> and{" "}
              <Link href="/privacy" className="underline underline-offset-2" target="_blank">privacy policy</Link>.
            </span>
          </label>
          {errors.consent && <p role="alert" className="text-sm font-medium text-destructive">{errors.consent}</p>}
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Booking summary">
        <div className="overflow-hidden rounded-3xl bg-pine-900 text-cream shadow-lift">
          <div className="p-6">
            <p className="text-sm text-mint-200">Your booking</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-snug">{service?.name}</p>
            <ul className="mt-5 grid gap-3 text-[0.95rem]">
              <li className="flex items-start gap-3"><Clock className="mt-0.5 size-4 shrink-0 text-coral-400" />{service?.duration_minutes} minutes</li>
              <li className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 shrink-0 text-coral-400" />{start ? `${longDay(start, tz)}, ${timeInZone(start, tz)}` : "Choose a time"}</li>
              <li className="flex items-start gap-3">{(() => { const I = MODE_META[mode].icon; return <I className="mt-0.5 size-4 shrink-0 text-coral-400" />; })()}{MODE_META[mode].label}</li>
            </ul>
          </div>
          <div className="flex items-end justify-between border-t border-white/10 p-6">
            <span className="text-mint-200">Total</span>
            <span className="font-display text-3xl font-semibold tabular-nums">{price ? formatMoney(price.minor, price.currency) : ""}</span>
          </div>
          <div className="p-6 pt-0">
            <Button type="submit" variant="coral" size="lg" className="w-full" disabled={pending}>
              {pending ? <><Loader2 className="animate-spin" />Please wait</> : isFree ? "Confirm booking" : "Continue to payment"}
            </Button>
            <p className="mt-3 text-center text-xs text-mint-200/80">
              {isFree ? "No payment needed." : "Your time is held while you pay."}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function StepHeading({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-4 font-display text-3xl font-semibold leading-tight tracking-tight">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pine-900 text-base text-cream">{n}</span>
      {children}
    </h2>
  );
}
