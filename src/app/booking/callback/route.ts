import { NextResponse, type NextRequest } from "next/server";
import { settlePayment } from "@/lib/booking/core";
import { paystackVerify } from "@/lib/payments/paystack";
import { flutterwaveVerifyByReference } from "@/lib/payments/flutterwave";
import { siteUrl } from "@/lib/utils";

/**
 * The patient lands here after paying. We never trust the redirect: the
 * provider is asked directly, then the patient is sent to their booking.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const provider = q.get("provider");
  const token = q.get("t") ?? "";
  // Paystack sends `reference`/`trxref`; Flutterwave sends `tx_ref`.
  const reference = q.get("reference") || q.get("trxref") || q.get("tx_ref") || "";
  const back = (ref: string, extra = "") => NextResponse.redirect(`${siteUrl()}/booking/${ref}?t=${token}${extra}`);
  if (!reference || !token) return NextResponse.redirect(`${siteUrl()}/book`);

  try {
    if (provider === "paystack") {
      const v = await paystackVerify(reference);
      if (v?.paid) await settlePayment({ reference, provider: "paystack", paidAmountMinor: v.amountMinor, paidCurrency: v.currency });
    } else if (provider === "flutterwave") {
      const v = await flutterwaveVerifyByReference(reference);
      if (v?.paid) await settlePayment({ reference, provider: "flutterwave", paidAmountMinor: v.amountMinor, paidCurrency: v.currency });
    }
  } catch (e) {
    console.error("callback verify failed", e);
  }
  return back(reference);
}
