"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-border !bg-white !text-foreground !shadow-lift !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
