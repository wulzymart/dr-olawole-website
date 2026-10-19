"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichEditor, type EditorValue } from "@/components/editor/rich-editor";
import { saveNotes, sendSummary } from "@/app/dashboard/actions";

interface Props {
  bookingId: string;
  clinicalHtml: string;
  clinicalJson: unknown;
  summaryHtml: string;
  summaryJson: unknown;
  followUpOn: string | null;
  summarySentAt: string | null;
}

export function NotesEditor(p: Props) {
  const clinical = useRef<EditorValue>({ html: p.clinicalHtml, json: p.clinicalJson });
  const summary = useRef<EditorValue>({ html: p.summaryHtml, json: p.summaryJson });
  const [followUp, setFollowUp] = useState(p.followUpOn ?? "");
  const [sentAt, setSentAt] = useState(p.summarySentAt);
  const [pending, start] = useTransition();

  async function persist() {
    return saveNotes({
      booking_id: p.bookingId,
      clinical_html: clinical.current.html,
      clinical_json: clinical.current.json,
      summary_html: summary.current.html,
      summary_json: summary.current.json,
      follow_up_on: followUp || null,
    });
  }

  return (
    <div className="grid gap-8">
      <section>
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Lock className="size-4 text-muted-foreground" aria-hidden /> Clinical notes
        </h3>
        <p className="mb-3 text-sm text-muted-foreground">Private. Only you can see these. They are never sent to the patient.</p>
        <RichEditor
          initialHtml={p.clinicalHtml}
          initialJson={p.clinicalJson as never}
          onChange={(v) => (clinical.current = v)}
          placeholder="History, examination findings, assessment and plan"
          folder="notes"
          minHeight="16rem"
        />
      </section>

      <section>
        <h3 className="font-display text-xl font-semibold">Summary for the patient</h3>
        <p className="mb-3 text-sm text-muted-foreground">Plain language: what we discussed, what to do next, and when to seek help. Emailed only when you press send.</p>
        <RichEditor
          initialHtml={p.summaryHtml}
          initialJson={p.summaryJson as never}
          onChange={(v) => (summary.current = v)}
          placeholder="What we discussed and the plan"
          folder="notes"
          minHeight="12rem"
        />
      </section>

      <div className="grid max-w-xs gap-1.5">
        <Label htmlFor="follow">Follow-up date (optional)</Label>
        <Input id="follow" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await persist();
              r.ok ? toast.success("Notes saved") : toast.error(r.error);
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : null} Save notes
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const saved = await persist();
              if (!saved.ok) {
                toast.error(saved.error);
                return;
              }
              const r = await sendSummary(p.bookingId);
              if (r.ok) {
                setSentAt(new Date().toISOString());
                toast.success(r.message ?? "Sent");
              } else toast.error(r.error);
            })
          }
        >
          <Send /> {sentAt ? "Send summary again" : "Save and email summary"}
        </Button>
        {sentAt && <span className="text-sm text-muted-foreground">Last emailed {new Date(sentAt).toLocaleString("en-GB")}</span>}
      </div>
    </div>
  );
}
