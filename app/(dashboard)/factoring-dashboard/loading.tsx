export default function FactoringDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-full bg-slate-200" />
        <div className="h-10 w-96 rounded-2xl bg-slate-200" />
        <div className="h-4 w-[32rem] rounded-full bg-slate-200" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-56 rounded-[1.5rem] border border-border/70 bg-white/70" />
        <div className="h-56 rounded-[1.5rem] border border-border/70 bg-white/70" />
      </div>
      <div className="h-44 rounded-[1.5rem] border border-border/70 bg-white/70" />
      <div className="h-20 rounded-[1.5rem] border border-border/70 bg-white/70" />
      <div className="h-80 rounded-[1.5rem] border border-border/70 bg-white/70" />
    </div>
  );
}
