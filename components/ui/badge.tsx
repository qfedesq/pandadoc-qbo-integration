import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] backdrop-blur",
  {
    variants: {
      variant: {
        default: "border-orange-400/30 bg-orange-500/14 text-orange-100",
        success: "border-emerald-400/30 bg-emerald-500/14 text-emerald-100",
        warning: "border-amber-300/30 bg-amber-400/14 text-amber-50",
        destructive: "border-rose-400/30 bg-rose-500/14 text-rose-100",
        muted: "border-white/12 bg-white/8 text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
