import Image from "next/image";
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
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <Image
          src="/brand/protofire-logomark.svg"
          alt="Protofire logomark"
          fill
          className="object-contain p-2"
          sizes="44px"
          priority
        />
      </div>
      <div className="min-w-0">
        <div className="relative h-6 w-[118px] sm:w-[140px]">
          <Image
            src="/brand/protofire-logotype.svg"
            alt="Protofire"
            fill
            className="object-contain object-left"
            sizes="140px"
            priority
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.22em] text-slate-300">
          <span>PandaDoc Factoring</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:block" />
          <span>{APP_DISPLAY_VERSION}</span>
        </div>
      </div>
    </Link>
  );
}
