import {
  FactoringTransactionStatus,
  LedgerOwnerType,
  UserRole,
} from "@prisma/client";
import Link from "next/link";

import { FactoringTransactionActions } from "@/components/factoring-transaction-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUserRole } from "@/lib/auth/require-user";
import {
  countFactoringTransactionsForCapitalSource,
  getOrCreateManagedCapitalSource,
  getWalletBalance,
  listFactoringEventsForCapitalSource,
  listFactoringTransactionsForCapitalSource,
} from "@/lib/db/factoring";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function OperatorPage() {
  await requireUserRole([UserRole.OPERATOR, UserRole.ADMIN]);
  const capitalSource = await getOrCreateManagedCapitalSource();
  const [
    positions,
    openPositionsCount,
    pendingPositionsCount,
    fundedPositionsCount,
    auditEvents,
    operatorBalance,
  ] =
    await Promise.all([
      listFactoringTransactionsForCapitalSource({
        capitalSourceId: capitalSource.id,
        statuses: [
          FactoringTransactionStatus.PENDING,
          FactoringTransactionStatus.FUNDED,
        ],
        take: 20,
      }),
      countFactoringTransactionsForCapitalSource({
        capitalSourceId: capitalSource.id,
        statuses: [
          FactoringTransactionStatus.PENDING,
          FactoringTransactionStatus.FUNDED,
        ],
      }),
      countFactoringTransactionsForCapitalSource({
        capitalSourceId: capitalSource.id,
        statuses: [FactoringTransactionStatus.PENDING],
      }),
      countFactoringTransactionsForCapitalSource({
        capitalSourceId: capitalSource.id,
        statuses: [FactoringTransactionStatus.FUNDED],
      }),
      listFactoringEventsForCapitalSource({
        capitalSourceId: capitalSource.id,
        take: 10,
      }),
      getWalletBalance({
        ownerType: LedgerOwnerType.OPERATOR,
        ownerId: capitalSource.operatorWallet ?? "protofire-operator",
        currency: "USDC",
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Operator console
          </p>
          <h1 className="text-4xl font-[var(--font-heading)] font-semibold tracking-tight">
            Repayment and controls
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Review the action queue, simulate settlement when needed, and verify
            that operator economics are booking correctly.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/capital-pool">Pool dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions">All transactions</Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/70 shadow-panel">
        <CardHeader className="space-y-1">
          <CardTitle>Operator snapshot</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep the console centered on what needs action now instead of
            scattering attention across separate KPI tiles.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-4">
          <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Action queue
            </span>
            <span className="mt-2 block text-3xl font-semibold text-foreground">
              {openPositionsCount}
            </span>
            <span className="mt-1 block">Open positions requiring review.</span>
          </div>
          <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Pending funding
            </span>
            <span className="mt-2 block text-3xl font-semibold text-foreground">
              {pendingPositionsCount}
            </span>
            <span className="mt-1 block">Positions accepted but not funded.</span>
          </div>
          <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Awaiting repayment
            </span>
            <span className="mt-2 block text-3xl font-semibold text-foreground">
              {fundedPositionsCount}
            </span>
            <span className="mt-1 block">Funded positions still outstanding.</span>
          </div>
          <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Operator economics
            </span>
            <span className="mt-2 block text-base font-semibold text-foreground">
              {formatCurrency(operatorBalance.toString(), "USDC")}
            </span>
            <span className="mt-1 block">
              Fees collected:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(
                  capitalSource.protocolFeesCollected.toString(),
                  "USDC",
                )}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-panel">
        <CardHeader className="space-y-1">
          <CardTitle>Positions requiring action</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use this queue to move positions from accepted to funded, and from funded
            to repaid.
          </p>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No pending or funded positions require operator action.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Economics</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {position.transactionReference}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDateTime(position.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{position.importedInvoice.providerInvoiceId}</div>
                        <div className="text-xs text-muted-foreground">
                          {position.importedInvoice.counterpartyName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={position.status} />
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatCurrency(position.netProceeds.toString(), "USDC")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Repays{" "}
                          {formatCurrency(
                            position.expectedRepaymentAmount.toString(),
                            "USDC",
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{formatDateTime(position.maturityDate)}</div>
                        <div className="text-xs text-muted-foreground">
                          Seller wallet {position.settlementDestinationMasked}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/factoring-dashboard/transactions/${position.id}`}
                            >
                              Open detail
                            </Link>
                          </Button>
                          <FactoringTransactionActions
                            transactionId={position.id}
                            status={position.status}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-panel">
        <CardHeader className="space-y-1">
          <CardTitle>Recent system events</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep the audit trail readable: event first, supporting references second.
          </p>
        </CardHeader>
        <CardContent>
          {auditEvents.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No audit events have been recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {event.message}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {event.eventType.replace(/_/g, " ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.importedInvoice.providerInvoiceId}
                      </TableCell>
                      <TableCell>
                        {event.factoringTransaction?.transactionReference ?? "—"}
                      </TableCell>
                      <TableCell>{formatDateTime(event.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
