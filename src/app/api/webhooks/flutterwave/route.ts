import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecret } from "@/lib/secrets";
import { safeEqual } from "@/lib/crypto";
import { settlePayment } from "@/lib/booking/core";
import { flutterwaveVerifyByReference } from "@/lib/payments/flutterwave";

export async function POST(request: Request) {
  const hash = await getSecret("flutterwave_webhook_hash");
  const sent = request.headers.get("verif-hash") ?? "";
  if (!hash || !sent || !safeEqual(hash, sent)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = (await request.json()) as { event?: string; data?: { tx_ref?: string; status?: string } };
  const reference = event.data?.tx_ref ?? null;
  await createAdminClient().from("payment_events").insert({ provider: "flutterwave", event_type: event.event, reference, payload: event });

  if (reference) {
    const v = await flutterwaveVerifyByReference(reference);
    if (v?.paid) {
      await settlePayment({ reference, provider: "flutterwave", paidAmountMinor: v.amountMinor, paidCurrency: v.currency });
    }
  }
  return NextResponse.json({ received: true });
}
