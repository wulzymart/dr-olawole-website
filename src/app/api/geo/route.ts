import { NextResponse } from "next/server";
import { currencyFromRequest } from "@/lib/geo";

// Tells the browser which currency to show, based on the visitor's location.
export function GET(request: Request) {
  return NextResponse.json(
    { currency: currencyFromRequest(request) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
