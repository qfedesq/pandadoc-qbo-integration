import { APP_DISPLAY_VERSION } from "@/lib/app-version";

export function AppVersionBadge() {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-full border border-white/15 bg-slate-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur">
      {APP_DISPLAY_VERSION}
    </div>
  );
}
