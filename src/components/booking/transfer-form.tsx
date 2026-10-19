"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { markTransferSent } from "@/app/actions/booking";

export function TransferForm({ reference, token }: { reference: string; token: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await markTransferSent(reference, token, note);
          if (r.ok) {
            toast.success("Thank you. I will confirm once the transfer shows in my account.");
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      <Field label="Sender name or transfer note (optional)" htmlFor="note" hint="Helps me find your payment faster.">
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <><Loader2 className="animate-spin" />Sending</> : "I have sent the transfer"}
      </Button>
    </form>
  );
}
