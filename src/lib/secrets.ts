import "server-only";
import { createAdminClient } from "./supabase/admin";
import { decrypt, encrypt, hintFor } from "./crypto";

/** Every API key the dashboard can store. Values are encrypted at rest. */
import { SECRET_KEYS, type SecretKey } from "./secrets-meta";
export { SECRET_KEYS, type SecretKey };

export async function getSecret(key: SecretKey): Promise<string | null> {
  const { data } = await createAdminClient().from("integration_secrets").select("ciphertext").eq("key", key).maybeSingle();
  if (!data) return null;
  try {
    return decrypt(data.ciphertext);
  } catch {
    return null;
  }
}

export async function setSecret(key: SecretKey, value: string) {
  const clean = value.trim();
  const db = createAdminClient();
  if (!clean) {
    await db.from("integration_secrets").delete().eq("key", key);
    return;
  }
  const { error } = await db.from("integration_secrets").upsert({
    key,
    ciphertext: encrypt(clean),
    hint: hintFor(clean),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Which keys are saved, with a masked hint. Never returns the secret itself. */
export async function secretStatus(): Promise<Record<SecretKey, { saved: boolean; hint: string | null }>> {
  const { data } = await createAdminClient().from("integration_secrets").select("key, hint");
  const saved = new Map((data ?? []).map((r) => [r.key as string, r.hint as string | null]));
  const out = {} as Record<SecretKey, { saved: boolean; hint: string | null }>;
  for (const k of Object.keys(SECRET_KEYS) as SecretKey[]) {
    out[k] = { saved: saved.has(k), hint: saved.get(k) ?? null };
  }
  return out;
}
