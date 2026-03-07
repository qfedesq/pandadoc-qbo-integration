import Link from "next/link";

import { APP_DISPLAY_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

export function AppBrand({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-xl border border-border/80 bg-card/80 px-4 py-3 text-left transition-colors duration-200 hover:bg-card",
        compact && "gap-3 px-3 py-2.5",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-primary/10 text-primary">
        <span className="font-[var(--font-heading)] text-sm font-semibold tracking-[0.14em]">
          PD
        </span>
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "font-[var(--font-heading)] text-base font-semibold tracking-tight text-white sm:text-lg",
            compact && "text-sm sm:text-base",
          )}
        >
          PandaDoc Working Capital
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Embedded finance demo</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <span>Built with Protofire</span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
          <span>{APP_DISPLAY_VERSION}</span>
        </div>
      </div>
    </Link>
  );
}
