import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { computeSlots } from "./slots";

const tz = "Africa/Lagos"; // UTC+1, no daylight saving
const base = {
  tz,
  rules: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start_time: "09:00", end_time: "12:00" })),
  exceptions: [],
  busy: [],
  now: DateTime.fromISO("2026-10-18T00:00:00", { zone: tz }),
  durationMinutes: 30,
  intervalMinutes: 30,
  bufferMinutes: 0,
  minNoticeHours: 0,
  maxAdvanceDays: 30,
  from: "2026-10-19",
  to: "2026-10-19",
};
const times = (r: Record<string, string[]>, d: string) =>
  (r[d] ?? []).map((iso) => DateTime.fromISO(iso).setZone(tz).toFormat("HH:mm"));

describe("computeSlots", () => {
  it("offers every interval inside the working window", () => {
    expect(times(computeSlots(base), "2026-10-19")).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("does not let a long session run past closing time", () => {
    const r = computeSlots({ ...base, durationMinutes: 60 });
    expect(times(r, "2026-10-19")).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("removes slots that overlap an existing booking, including the buffer", () => {
    const busy = [{ start_at: "2026-10-19T09:00:00Z", end_at: "2026-10-19T09:30:00Z" }]; // 10:00-10:30 Lagos
    const r = computeSlots({ ...base, busy, bufferMinutes: 15 });
    expect(times(r, "2026-10-19")).toEqual(["09:00", "11:00", "11:30"]);
  });

  it("honours minimum notice", () => {
    const now = DateTime.fromISO("2026-10-19T08:00:00", { zone: tz });
    const r = computeSlots({ ...base, now, minNoticeHours: 2 });
    expect(times(r, "2026-10-19")).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("treats a closed exception as a day off", () => {
    const exceptions = [{ on_date: "2026-10-19", is_closed: true, start_time: null, end_time: null }];
    expect(computeSlots({ ...base, exceptions })["2026-10-19"]).toBeUndefined();
  });

  it("uses special hours from an exception instead of the weekly rule", () => {
    const exceptions = [{ on_date: "2026-10-19", is_closed: false, start_time: "14:00", end_time: "15:00" }];
    expect(times(computeSlots({ ...base, exceptions }), "2026-10-19")).toEqual(["14:00", "14:30"]);
  });

  it("stops offering days beyond the booking horizon", () => {
    const r = computeSlots({ ...base, maxAdvanceDays: 1, from: "2026-10-18", to: "2026-10-25" });
    expect(Object.keys(r)).toEqual(["2026-10-18", "2026-10-19"]);
  });
});
