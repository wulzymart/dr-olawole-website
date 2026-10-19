import "server-only";
import { getSecret } from "../secrets";

const API = "https://api.flutterwave.com/v3";

export async function flutterwaveInitialize(args: {
  email: string;
  name: string;
  phone: string;
  amountMinor: number;
  currency: string;
  reference: string;
  redirectUrl: string;
  title: string;
}): Promise<{ link: string }> {
  const key = await getSecret("flutterwave_secret");
  if (!key) throw new Error("Flutterwave is not configured.");
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: args.reference,
      amount: args.amountMinor / 100, // Flutterwave takes the major unit
      currency: args.currency,
      redirect_url: args.redirectUrl,
      customer: { email: args.email, name: args.name, phonenumber: args.phone },
      customizations: { title: args.title },
    }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success") throw new Error(json.message || "Flutterwave could not start the payment.");
  return { link: json.data.link as string };
}

export async function flutterwaveVerifyByReference(reference: string) {
  const key = await getSecret("flutterwave_secret");
  if (!key) throw new Error("Flutterwave is not configured.");
  const res = await fetch(`${API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success" || !json.data) return null;
  return {
    paid: json.data.status === "successful",
    amountMinor: Math.round(Number(json.data.amount) * 100),
    currency: json.data.currency as string,
    reference: json.data.tx_ref as string,
  };
}
