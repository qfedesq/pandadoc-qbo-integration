import {
  FactoringTransactionStatus,
  LedgerOwnerType,
  UserRole,
} from "@prisma/client";
import Link from "next/link";

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
  getOrCreateManagedCapitalSource,
  getWalletBalance,
  listFactoringTransactionsForCapitalSource,
  listPoolTransactions,
} from "@/lib/db/factoring";
import { summarizeCapitalPool } from "@/lib/factoring/capital-pool";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function CapitalPoolPage() {
  await requireUserRole([UserRole.OPERATOR, UserRole.ADMIN]);
  const capitalSource = await getOrCreateManagedCapitalSource();
  const [activePositions, poolTransactions, operatorBalance] = await Promise.all([
    listFactoringTransactionsForCapitalSource({
      capitalSourceId: capitalSource.id,
      statuses: [FactoringTransactionStatus.FUNDED],
      take: 20,
    }),
    listPoolTransactions({
      capitalSourceId: capitalSource.id,
      take: 12,
    }),
    getWalletBalance({
      ownerType: LedgerOwnerType.OPERATOR,
      ownerId: capitalSource.operatorWallet ?? "protofire-operator",
      currency: "USDC",
    }),
  ]);
  const summary = summarizeCapitalPool(capitalSource);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Capital provider view
          </p>
          <h1 className="text-4xl font-[var(--font-heading)] font-semibold tracking-tight">
            Capital pool dashboard
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Monitor liquidity deployment, repayment economics, and the balances
            that support the managed invoice-factoring program.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/operator">Open operator console</Link>
        </Button>
      </div>

      <Card className="border-border/70 shadow-panel">
        <CardHeader className="space-y-1">
          <CardTitle>Liquidity overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep the pool state in one place so active positions and cash movements
            become easier to interpret. Total capital is derived from live liquidity
            buckets instead of a stale snapshot field.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Capital under management
              </span>
              <span className="mt-2 block text-xl font-semibold text-foreground">
                {formatCurrency(summary.managedCapital, "USDC")}
              </span>
            </div>
            <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Available
              </span>
              <span className="mt-2 block text-xl font-semibold text-foreground">
                {formatCurrency(summary.availableLiquidity, "USDC")}
              </span>
            </div>
            <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Deployed
              </span>
              <span className="mt-2 block text-xl font-semibold text-foreground">
                {formatCurrency(summary.deployedLiquidity, "USDC")}
              </span>
            </div>
            <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Accrued yield
              </span>
              <span className="mt-2 block text-xl font-semibold text-foreground">
                {formatCurrency(summary.accruedYield, "USDC")}
              </span>
            </div>
            <div className="rounded-[1rem] border border-border/80 bg-background/35 p-4">
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Platform fees
              </span>
              <span className="mt-2 block text-xl font-semibold text-foreground">
                {formatCurrency(summary.protocolFeesCollected, "USDC")}
              </span>
            </div>
          </div>
          <div className="grid gap-4 border-t border-border/70 pt-4 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Deployment ratio
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {formatPercent(summary.deploymentRatio)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Liquidity remaining
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {formatPercent(summary.availableRatio)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Operator fee wallet
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {formatCurrency(operatorBalance.toString(), "USDC")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-panel">
        <CardHeader className="space-y-1">
          <CardTitle>Funded positions drawing from the pool</CardTitle>
          <p className="text-sm text-muted-foreground">
            Focus this table on exposure and maturity instead of splitting every
            number into its own column.
          </p>
        </CardHeader>
        <CardContent>
          {activePositions.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No funded invoices are currently drawing from the pool.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Exposure</TableHead>
                    <TableHead>Maturity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePositions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {position.importedInvoice.providerInvoiceId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {position.importedInvoice.counterpartyName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {formatCurrency(
                            position.netProceeds.toString(),
                            "USDC",
                          )}
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
                        <div>{formatDate(position.maturityDate)}</div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDateTime(position.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={position.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/factoring-dashboard/transactions/${position.id}`}
                          >
                            View
                          </Link>
                        </Button>
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
          <CardTitle>Pool transaction log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Group principal, yield, and fee into one economic view so cash movement
            reads faster.
          </p>
        </CardHeader>
        <CardContent>
          {poolTransactions.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-border p-6 text-sm text-muted-foreground">
              No pool transactions have been recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Linked position</TableHead>
                    <TableHead>Amount movement</TableHead>
                    <TableHead>Economics</TableHead>
                    <TableHead>Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poolTransactions.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {entry.transactionType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {entry.factoringTransaction?.transactionReference ?? "—"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(entry.amount.toString(), "USDC")}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          Principal{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(
                              entry.principalAmount.toString(),
                              "USDC",
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Yield{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(
                              entry.yieldAmount.toString(),
                              "USDC",
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Fee{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(entry.feeAmount.toString(), "USDC")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
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
