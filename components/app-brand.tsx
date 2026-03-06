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
        "group inline-flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10",
        compact && "gap-3 px-3 py-2.5",
        className,
      )}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.26),_rgba(255,255,255,0.08)_40%,_rgba(2,6,23,0.85)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        <span className="font-[var(--font-heading)] text-sm font-semibold tracking-[0.14em] text-white">
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
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.22em] text-slate-300">
          <span>Embedded finance demo</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:block" />
          <span>Built with Protofire</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:block" />
          <span>{APP_DISPLAY_VERSION}</span>
        </div>
      </div>
    </Link>
  );
}
