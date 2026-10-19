import { Badge } from "@/components/ui/badge";
import type { BookingStatus, PaymentStatus } from "@/lib/types";

const STATUS: Record<BookingStatus, { label: string; variant: "success" | "warning" | "danger" | "muted" | "soft" | "coral" }> = {
  pending_payment: { label: "Awaiting payment", variant: "warning" },
  awaiting_verification: { label: "Verify transfer", variant: "coral" },
  confirmed: { label: "Confirmed", variant: "success" },
  completed: { label: "Completed", variant: "soft" },
  cancelled: { label: "Cancelled", variant: "muted" },
  no_show: { label: "No show", variant: "danger" },
  expired: { label: "Expired", variant: "muted" },
};

const PAYMENT: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "danger" | "muted" | "soft" }> = {
  unpaid: { label: "Unpaid", variant: "muted" },
  pending_verification: { label: "Transfer to verify", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  failed: { label: "Payment failed", variant: "danger" },
  refunded: { label: "Refunded", variant: "soft" },
  waived: { label: "No charge", variant: "soft" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
