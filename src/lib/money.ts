import type { Currency, Service } from "./types";

/** Country code -> currency. Nigeria pays in naira, everyone else in dollars. */
export function currencyForCountry(country: string | null | undefined): Currency {
  const c = (country ?? "").trim().toUpperCase();
  // No signal at all (local dev, privacy tools): fall back to naira.
  if (!c || c === "XX" || c === "T1") return "NGN";
  return c === "NG" ? "NGN" : "USD";
}

export function priceFor(service: Pick<Service, "price_ngn_kobo" | "price_usd_cents">, currency: Currency) {
  if (currency === "USD" && service.price_usd_cents != null) {
    return { currency: "USD" as const, minor: service.price_usd_cents };
  }
  return { currency: "NGN" as const, minor: service.price_ngn_kobo };
}

export function formatMoney(minor: number, currency: Currency) {
  if (minor === 0) return "Free";
  const major = minor / 100;
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

export function majorToMinor(value: string | number) {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function minorToMajorString(minor: number | null | undefined) {
  if (minor == null) return "";
  return (minor / 100).toString();
}
