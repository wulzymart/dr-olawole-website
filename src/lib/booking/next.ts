import "server-only";
import { DateTime } from "luxon";
import { availableSlots } from "./core";
import type { Service } from "@/lib/types";

/** The earliest open time across all consultation types, for the home page. */
export async function nextAvailable(services: Service[], tz: string) {
  try {
    if (!services.length) return null;
    const shortest = [...services].sort((a, b) => a.duration_minutes - b.duration_minutes)[0];
    const from = DateTime.now().setZone(tz).toFormat("yyyy-MM-dd");
    const to = DateTime.now().setZone(tz).plus({ days: 21 }).toFormat("yyyy-MM-dd");
    const slots = await availableSlots(shortest, from, to);
    const first = Object.keys(slots).sort()[0];
    if (!first) return null;
    const dt = DateTime.fromISO(slots[first][0]).setZone(tz);
    const today = DateTime.now().setZone(tz).startOf("day");
    const diff = dt.startOf("day").diff(today, "days").days;
    const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : dt.toFormat("cccc d LLL");
    return { day, time: dt.toFormat("h:mm a"), iso: dt.toUTC().toISO()! };
  } catch {
    return null;
  }
}
