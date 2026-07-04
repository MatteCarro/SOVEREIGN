"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent/85 shadow-[0_0_18px_-6px_hsl(38_65%_58%/0.5)]",
        secondary: "bg-raised text-foreground border border-border hover:bg-raised/70 hover:border-border-strong",
        ghost: "text-muted hover:text-foreground hover:bg-raised/60",
        outline: "border border-border-strong text-foreground hover:bg-raised/60",
        danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
        success: "bg-success/15 text-success border border-success/40 hover:bg-success/25",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
