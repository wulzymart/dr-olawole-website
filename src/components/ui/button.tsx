import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[0.95rem] font-semibold transition-[background,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-pine-800 shadow-soft",
        coral: "bg-coral-400 text-pine-950 hover:bg-coral-500 hover:text-white shadow-soft",
        outline: "border border-pine-900/25 bg-transparent text-foreground hover:bg-pine-900 hover:text-cream",
        secondary: "bg-secondary text-secondary-foreground hover:bg-mint-200",
        ghost: "text-foreground hover:bg-pine-900/8",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        link: "rounded-none p-0 text-coral-700 underline underline-offset-4 hover:text-coral-500",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
