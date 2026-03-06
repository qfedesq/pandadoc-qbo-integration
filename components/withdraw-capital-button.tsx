import Link from "next/link";

import { Button } from "@/components/ui/button";

export function WithdrawCapitalButton({
  href,
  disabledReason,
}: {
  href?: string;
  disabledReason?: string | null;
}) {
  if (!href) {
    return (
      <div className="space-y-2 text-right">
        <Button type="button" variant="secondary" disabled>
          Withdraw Capital
        </Button>
        {disabledReason ? (
          <p className="max-w-56 text-xs text-muted-foreground">{disabledReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Button asChild>
      <Link href={href}>Withdraw Capital</Link>
    </Button>
  );
}
