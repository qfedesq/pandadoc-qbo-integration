import { type IntegrationConnection } from "@prisma/client";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

type Props = {
  label: string;
  description: string;
  connection: IntegrationConnection | null;
  metadataLabel: string;
  metadataValue: string;
};

export function FactoringConnectionCard({
  label,
  description,
  connection,
  metadataLabel,
  metadataValue,
}: Props) {
  const isConnected = connection?.status === "CONNECTED";

  return (
    <Card className="h-full border-border/70 bg-white/85 shadow-panel">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{label}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <StatusBadge status={connection?.status ?? "DISCONNECTED"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            Account
          </p>
          <p className="mt-1 font-medium text-foreground">
            {connection?.externalAccountName ?? "Not connected"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            {metadataLabel}
          </p>
          <p className="mt-1 font-medium text-foreground">{metadataValue}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">
            Last sync
          </p>
          <p className="mt-1 font-medium text-foreground">
            {formatDateTime(connection?.lastSyncAt)}
          </p>
        </div>
        {connection?.lastError ? (
          <div className="rounded-2xl bg-rose-50 px-3 py-2 text-rose-700">
            {connection.lastError}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button asChild variant={isConnected ? "secondary" : "default"}>
          <Link href="/integrations">
            {isConnected ? "Manage connection" : "Connect provider"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
