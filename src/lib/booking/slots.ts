import { DateTime, Interval } from "luxon";

export interface Rule {
  weekday: number; // ISO 1 = Monday ... 7 = Sunday
  start_time: string; // "HH:mm" or "HH:mm:ss", wall clock in the site time zone
  end_time: string;
}
export interface Exception {
  on_date: string; // yyyy-MM-dd
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
}
export interface Busy {
  start_at: string;
  end_at: string;
}
export interface SlotInput {
  tz: string;
  rules: Rule[];
  exceptions: Exception[];
  busy: Busy[];
  now: DateTime;
  durationMinutes: number;
  intervalMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  /** yyyy-MM-dd, inclusive, interpreted in the site time zone */
  from: string;
  to: string;
}

function at(day: DateTime, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return day.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/**
 * Returns available start times (UTC ISO strings) grouped by site-local date.
 * Working windows come from weekly rules, replaced by an exception for that
 * date when one exists. A start is offered only when the whole consultation
 * plus the buffer on both sides is clear of other bookings.
 */
export function computeSlots(input: SlotInput): Record<string, string[]> {
  const { tz, rules, exceptions, busy, now, durationMinutes, intervalMinutes, bufferMinutes } = input;
  const earliest = now.plus({ hours: input.minNoticeHours });
  const latest = now.setZone(tz).plus({ days: input.maxAdvanceDays }).endOf("day");

  const busyIntervals = busy.map((b) =>
    Interval.fromDateTimes(
      DateTime.fromISO(b.start_at).minus({ minutes: bufferMinutes }),
      DateTime.fromISO(b.end_at).plus({ minutes: bufferMinutes }),
    ),
  );

  const out: Record<string, string[]> = {};
  let day = DateTime.fromISO(input.from, { zone: tz }).startOf("day");
  const last = DateTime.fromISO(input.to, { zone: tz }).startOf("day");

  while (day <= last) {
    const key = day.toFormat("yyyy-MM-dd");
    const exception = exceptions.filter((e) => e.on_date === key);
    let windows: { start: string; end: string }[];
    if (exception.length > 0) {
      windows = exception.some((e) => e.is_closed)
        ? []
        : exception.map((e) => ({ start: e.start_time!, end: e.end_time! }));
    } else {
      windows = rules.filter((r) => r.weekday === day.weekday).map((r) => ({ start: r.start_time, end: r.end_time }));
    }

    const starts: string[] = [];
    for (const w of windows) {
      const winStart = at(day, w.start);
      const winEnd = at(day, w.end);
      for (
        let s = winStart;
        s.plus({ minutes: durationMinutes }) <= winEnd;
        s = s.plus({ minutes: intervalMinutes })
      ) {
        if (s < earliest || s > latest) continue;
        const slot = Interval.fromDateTimes(s, s.plus({ minutes: durationMinutes }));
        if (busyIntervals.some((b) => b.overlaps(slot))) continue;
        starts.push(s.toUTC().toISO()!);
      }
    }
    if (starts.length) out[key] = Array.from(new Set(starts)).sort();
    day = day.plus({ days: 1 });
  }
  return out;
}
