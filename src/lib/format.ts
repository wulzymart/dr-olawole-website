import { DateTime } from "luxon";

export function fmtDate(iso: string, zone: string) {
  return DateTime.fromISO(iso).setZone(zone).toFormat("ccc d LLL yyyy");
}
export function fmtTime(iso: string, zone: string) {
  return DateTime.fromISO(iso).setZone(zone).toFormat("h:mm a");
}
export function fmtDateTime(iso: string, zone: string) {
  return DateTime.fromISO(iso).setZone(zone).toFormat("ccc d LLL, h:mm a");
}
export function relative(iso: string) {
  return DateTime.fromISO(iso).toRelative() ?? "";
}
export function todayKey(zone: string) {
  return DateTime.now().setZone(zone).toFormat("yyyy-MM-dd");
}
