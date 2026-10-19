import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-lg border border-input bg-white px-4 text-base text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-pine-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral-400/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
export { Input };
