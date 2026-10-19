import "server-only";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { currencyForCountry } from "./money";
import type { Currency } from "./types";

function countryFrom(get: (name: string) => string | null): string {
  return (
    get("x-vercel-ip-country") || // Vercel
    get("cf-ipcountry") || // Cloudflare, if ever placed in front
    get("x-country-code") ||
    process.env.GEO_DEFAULT_COUNTRY || // local development
    ""
  ).toUpperCase();
}

/** Visitor country from edge headers, inside a Server Component or action. */
export async function getVisitorCountry(): Promise<string> {
  const h = await headers();
  return countryFrom((n) => h.get(n));
}

export async function getVisitorCurrency(): Promise<Currency> {
  return currencyForCountry(await getVisitorCountry());
}

export function currencyFromRequest(req: NextRequest | Request): Currency {
  return currencyForCountry(countryFrom((n) => req.headers.get(n)));
}
