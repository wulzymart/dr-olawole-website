import "server-only";
import { getSecret } from "../secrets";

const API = "https://api.paystack.co";

export async function paystackInitialize(args: {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string }> {
  const key = await getSecret("paystack_secret");
  if (!key) throw new Error("Paystack is not configured.");
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: args.email,
      amount: args.amountMinor,
      currency: args.currency,
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: args.metadata,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || "Paystack could not start the payment.");
  return { authorizationUrl: json.data.authorization_url as string };
}

export async function paystackVerify(reference: string) {
  const key = await getSecret("paystack_secret");
  if (!key) throw new Error("Paystack is not configured.");
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.status) return null;
  return {
    paid: json.data.status === "success",
    amountMinor: json.data.amount as number,
    currency: json.data.currency as string,
    reference: json.data.reference as string,
  };
}
