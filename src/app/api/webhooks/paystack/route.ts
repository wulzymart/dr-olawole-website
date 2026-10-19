import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecret } from "@/lib/secrets";
import { hmacSha512Hex, safeEqual } from "@/lib/crypto";
import { settlePayment } from "@/lib/booking/core";
import { paystackVerify } from "@/lib/payments/paystack";

export async function POST(request: Request) {
  const raw = await request.text(); // the signature covers the exact raw body
  const secret = await getSecret("paystack_secret");
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!secret || !signature || !safeEqual(hmacSha512Hex(secret, raw), signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
  const reference = event.data?.reference ?? null;
  await createAdminClient().from("payment_events").insert({ provider: "paystack", event_type: event.event, reference, payload: event });

  if (event.event === "charge.success" && reference) {
    // Confirm with Paystack directly rather than trusting the payload alone.
    const v = await paystackVerify(reference);
    if (v?.paid) {
      await settlePayment({ reference, provider: "paystack", paidAmountMinor: v.amountMinor, paidCurrency: v.currency });
    }
  }
  return NextResponse.json({ received: true });
}
