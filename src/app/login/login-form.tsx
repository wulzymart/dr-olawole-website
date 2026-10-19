"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendSignInLink, type LoginState } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendSignInLink, { ok: false, message: "" });
  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl bg-mint-100 p-6">
        <MailCheck className="size-8 text-pine-700" />
        <p className="mt-4 font-display text-2xl font-semibold">Check your email</p>
        <p className="mt-2 text-pine-800">{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5">
      {notice && <p role="alert" className="rounded-xl bg-amber-100 p-4 text-sm text-amber-900">{notice}</p>}
      <Field label="Email address" htmlFor="email" error={state.message}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <><Loader2 className="animate-spin" />Sending</> : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
