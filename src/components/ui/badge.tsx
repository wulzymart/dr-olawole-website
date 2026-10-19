import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-pine-900 text-cream",
      soft: "bg-mint-100 text-pine-900",
      coral: "bg-coral-400/25 text-coral-700",
      outline: "border border-pine-900/25 text-foreground",
      success: "bg-emerald-100 text-emerald-900",
      warning: "bg-amber-100 text-amber-900",
      danger: "bg-red-100 text-red-900",
      muted: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { variant: "soft" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge };
