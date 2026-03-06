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
          ? "border-rose-200 bg-rose-50/80"
          : "border-emerald-200 bg-emerald-50/80"
      }
    >
      <CardContent className="p-4 text-sm">
        <p className={error ? "text-rose-700" : "text-emerald-700"}>
          {error ?? notice}
        </p>
      </CardContent>
    </Card>
  );
}
