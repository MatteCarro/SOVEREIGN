import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-raised text-foreground",
        accent: "border-accent/50 bg-accent/10 text-accent",
        danger: "border-danger/50 bg-danger/10 text-danger",
        warning: "border-warning/50 bg-warning/10 text-warning",
        success: "border-success/50 bg-success/10 text-success",
        info: "border-info/50 bg-info/10 text-info",
        muted: "border-border bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
