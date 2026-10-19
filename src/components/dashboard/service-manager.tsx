"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteService, saveService } from "@/app/dashboard/actions";
import { formatMoney, minorToMajorString } from "@/lib/money";
import type { MeetingMode, Service } from "@/lib/types";

const MODES: { id: MeetingMode; label: string }[] = [
  { id: "meet", label: "Google Meet video call" },
  { id: "phone", label: "Phone call" },
  { id: "whatsapp", label: "WhatsApp call" },
];

interface Draft {
  id?: string;
  name: string;
  summary: string;
  description: string;
  duration_minutes: string;
  price_ngn: string;
  price_usd: string;
  modes: MeetingMode[];
  is_active: boolean;
  sort_order: string;
}

const blank = (n: number): Draft => ({
  name: "",
  summary: "",
  description: "",
  duration_minutes: "30",
  price_ngn: "",
  price_usd: "",
  modes: ["meet", "phone", "whatsapp"],
  is_active: true,
  sort_order: String(n),
});

const fromService = (s: Service): Draft => ({
  id: s.id,
  name: s.name,
  summary: s.summary,
  description: s.description,
  duration_minutes: String(s.duration_minutes),
  price_ngn: minorToMajorString(s.price_ngn_kobo),
  price_usd: minorToMajorString(s.price_usd_cents),
  modes: s.modes,
  is_active: s.is_active,
  sort_order: String(s.sort_order),
});

export function ServiceManager({ services }: { services: Service[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    start(async () => {
      const r = await saveService({
        ...draft,
        duration_minutes: Number(draft.duration_minutes),
        sort_order: Number(draft.sort_order || 0),
      });
      if (r.ok) {
        toast.success(r.message ?? "Saved");
        setDraft(null);
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setDraft(blank(services.length + 1))}>
          <Plus /> New consultation type
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <p className="font-display text-xl font-semibold">No consultation types yet</p>
          <p className="mt-1 text-muted-foreground">Add one so patients have something to book.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <li key={s.id} className="flex flex-col rounded-2xl border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                  <p className="text-muted-foreground">{s.duration_minutes} minutes</p>
                </div>
                {!s.is_active && <Badge variant="muted">Hidden</Badge>}
              </div>
              <p className="mt-3 flex-1 text-[0.95rem]">{s.summary}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">In Nigeria</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(s.price_ngn_kobo, "NGN")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Everywhere else</dt>
                  <dd className="font-semibold tabular-nums">{s.price_usd_cents == null ? "Not set" : formatMoney(s.price_usd_cents, "USD")}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft(fromService(s))}>
                  <Pencil /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Delete "${s.name}"? Past bookings keep their details.`)) return;
                    start(async () => {
                      const r = await deleteService(s.id);
                      r.ok ? toast.success("Deleted") : toast.error(r.error);
                    });
                  }}
                >
                  <Trash2 /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit consultation type" : "New consultation type"}</DialogTitle>
            <DialogDescription>Patients in Nigeria see the naira price. Everyone else sees the dollar price. They never choose.</DialogDescription>
          </DialogHeader>
          {draft && (
            <form onSubmit={submit} className="grid gap-5">
              <Field label="Name" htmlFor="sv-name">
                <Input id="sv-name" value={draft.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
              </Field>
              <Field label="One line for patients" htmlFor="sv-sum">
                <Input id="sv-sum" value={draft.summary} onChange={(e) => set("summary", e.target.value)} maxLength={160} />
              </Field>
              <Field label="Longer description" htmlFor="sv-desc">
                <Textarea id="sv-desc" rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={1200} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Length (minutes)" htmlFor="sv-dur">
                  <Input id="sv-dur" type="number" min={5} max={480} step={5} value={draft.duration_minutes} onChange={(e) => set("duration_minutes", e.target.value)} required />
                </Field>
                <Field label="Price in naira (₦)" htmlFor="sv-ngn" hint="0 means free">
                  <Input id="sv-ngn" inputMode="decimal" value={draft.price_ngn} onChange={(e) => set("price_ngn", e.target.value)} required />
                </Field>
                <Field label="Price in dollars ($)" htmlFor="sv-usd" hint="Needed for patients abroad">
                  <Input id="sv-usd" inputMode="decimal" value={draft.price_usd} onChange={(e) => set("price_usd", e.target.value)} />
                </Field>
              </div>
              <fieldset className="grid gap-2.5">
                <legend className="mb-1 text-sm font-semibold">How patients can meet you</legend>
                {MODES.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`mode-${m.id}`}
                      checked={draft.modes.includes(m.id)}
                      onCheckedChange={(v) => set("modes", v === true ? [...draft.modes, m.id] : draft.modes.filter((x) => x !== m.id))}
                    />
                    <Label htmlFor={`mode-${m.id}`} className="font-normal">{m.label}</Label>
                  </div>
                ))}
              </fieldset>
              <div className="grid items-end gap-5 sm:grid-cols-2">
                <Field label="Order on the page (1 is first)" htmlFor="sv-ord">
                  <Input id="sv-ord" type="number" min={0} value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
                </Field>
                <div className="flex items-center gap-3 pb-2">
                  <Switch id="sv-active" checked={draft.is_active} onCheckedChange={(v) => set("is_active", v)} />
                  <Label htmlFor="sv-active">Available to book</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : null} Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
