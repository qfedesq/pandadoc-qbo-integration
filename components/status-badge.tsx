import type { ComponentProps } from "react";
import { InvoiceStatus, IntegrationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

type StatusValue = InvoiceStatus | IntegrationStatus;

const variants: Record<StatusValue, ComponentProps<typeof Badge>["variant"]> = {
  CONNECTED: "success",
  DISCONNECTED: "muted",
  ERROR: "destructive",
  OPEN: "default",
  OVERDUE: "warning",
  PAID: "success",
  PARTIALLY_PAID: "warning",
};

export function StatusBadge({ status }: { status: StatusValue }) {
  return <Badge variant={variants[status]}>{status.replace(/_/g, " ")}</Badge>;
}
