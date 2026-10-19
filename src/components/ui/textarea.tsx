import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-lg border border-input bg-white px-4 py-3 text-base text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-pine-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral-400/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
export { Textarea };
