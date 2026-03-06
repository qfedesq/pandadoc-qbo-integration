import { Card, CardContent } from "@/components/ui/card";

export function NoticeBanner({
  notice,
  error,
}: {
  notice?: string;
  error?: string;
}) {
  if (!notice && !error) {
    return null;
  }

  return (
    <Card
      className={
        error
          ? "border-rose-400/30 bg-rose-500/10"
          : "border-emerald-400/30 bg-emerald-500/10"
      }
    >
      <CardContent className="p-4 text-sm">
        <p className={error ? "text-rose-100" : "text-emerald-100"}>
          {error ?? notice}
        </p>
      </CardContent>
    </Card>
  );
}
