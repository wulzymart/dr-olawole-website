"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { addException, deleteException, saveWeeklyHours } from "@/app/dashboard/actions";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Period {
  start_time: string;
  end_time: string;
}
export interface Rule extends Period {
  weekday: number;
}
export interface Exception {
  id: string;
  on_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
}

const hm = (t: string) => t.slice(0, 5);

export function WeeklyHours({ rules }: { rules: Rule[] }) {
  const [days, setDays] = useState<Period[][]>(() =>
    DAYS.map((_, i) => rules.filter((r) => r.weekday === i + 1).map((r) => ({ start_time: hm(r.start_time), end_time: hm(r.end_time) }))),
  );
  const [pending, start] = useTransition();

  const update = (d: number, i: number, patch: Partial<Period>) =>
    setDays((all) => all.map((list, di) => (di === d ? list.map((p, pi) => (pi === i ? { ...p, ...patch } : p)) : list)));

  return (
    <form
      className="grid gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const payload = days.flatMap((list, d) => list.map((p) => ({ weekday: d + 1, ...p })));
          const r = await saveWeeklyHours(payload);
          r.ok ? toast.success(r.message ?? "Saved") : toast.error(r.error);
        });
      }}
    >
      {DAYS.map((name, d) => {
        const list = days[d];
        const open = list.length > 0;
        return (
          <div key={name} className="grid gap-3 border-b py-4 last:border-0 sm:grid-cols-[11rem_1fr] sm:items-start">
            <div className="flex items-center gap-3">
              <Switch
                id={`day-${d}`}
                checked={open}
                aria-label={`${name} open`}
                onCheckedChange={(on) =>
                  setDays((all) => all.map((l, i) => (i === d ? (on ? [{ start_time: "09:00", end_time: "17:00" }] : []) : l)))
                }
              />
              <Label htmlFor={`day-${d}`} className="text-base">{name}</Label>
            </div>
            <div className="grid gap-2">
              {!open && <p className="py-1.5 text-muted-foreground">Not available</p>}
              {list.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input type="time" aria-label={`${name} start`} value={p.start_time} onChange={(e) => update(d, i, { start_time: e.target.value })} className="w-32" required />
                  <span aria-hidden className="text-muted-foreground">to</span>
                  <Input type="time" aria-label={`${name} end`} value={p.end_time} onChange={(e) => update(d, i, { end_time: e.target.value })} className="w-32" required />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove period on ${name}`}
                    onClick={() => setDays((all) => all.map((l, di) => (di === d ? l.filter((_, pi) => pi !== i) : l)))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {open && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={() => setDays((all) => all.map((l, di) => (di === d ? [...l, { start_time: "18:00", end_time: "20:00" }] : l)))}
                >
                  <Plus /> Add another period
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <div className="pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Save weekly hours
        </Button>
      </div>
    </form>
  );
}

export function Exceptions({ items }: { items: Exception[] }) {
  const [date, setDate] = useState("");
  const [closed, setClosed] = useState(true);
  const [from, setFrom] = useState("10:00");
  const [to, setTo] = useState("14:00");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-4 rounded-2xl border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addException({ on_date: date, is_closed: closed, start_time: closed ? null : from, end_time: closed ? null : to, note: note || null });
            if (r.ok) {
              toast.success(r.message ?? "Added");
              setDate("");
              setNote("");
            } else toast.error(r.error);
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ex-date">Date</Label>
            <Input id="ex-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ex-note">Note (only you see it)</Label>
            <Input id="ex-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Conference, public holiday" maxLength={160} />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox id="ex-closed" checked={closed} onCheckedChange={(v) => setClosed(v === true)} />
          <Label htmlFor="ex-closed" className="font-normal">I am off all day</Label>
        </div>
        {!closed && (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="time" aria-label="Special start" value={from} onChange={(e) => setFrom(e.target.value)} className="w-32" />
            <span aria-hidden className="text-muted-foreground">to</span>
            <Input type="time" aria-label="Special end" value={to} onChange={(e) => setTo(e.target.value)} className="w-32" />
            <span className="text-sm text-muted-foreground">Replaces your usual hours on this date.</span>
          </div>
        )}
        <Button type="submit" variant="outline" className="w-fit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add date
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No time off or special hours coming up.</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {items.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {new Date(`${x.on_date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {x.is_closed ? "Off all day" : `Special hours ${hm(x.start_time ?? "")} to ${hm(x.end_time ?? "")}`}
                  {x.note ? `, ${x.note}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove this date"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteException(x.id);
                    r.ok ? toast.success("Removed") : toast.error(r.error);
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
