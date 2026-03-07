import {
  FactoringTransactionStatus,
  LedgerOwnerType,
  Provider,
} from "@prisma/client";
import Link from "next/link";

import { InvoiceFilters } from "@/components/invoice-filters";
import { FactoringSetupGuide } from "@/components/factoring-setup-guide";
import { InvoiceTable } from "@/components/invoice-table";
import { QueryPagination } from "@/components/query-pagination";
import { RecentFactoringTransactions } from "@/components/recent-factoring-transactions";
import { SyncButton } from "@/components/sync-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";
import {
  countEligibleFactoringInvoicesForUser,
  countFactoringInvoicesForUser,
  countFactoringTransactionsByStatus,
  getOrCreateManagedCapitalSource,
  getWalletBalance,
  listFactoringInvoicesForUser,
  listRecentFactoringTransactionsForUser,
} from "@/lib/db/factoring";
import { findUserConnection } from "@/lib/db/integrations";
import { getLatestSyncRun } from "@/lib/db/invoices";
import { hasPandaDocImportConfig } from "@/lib/env";
import { invoiceListSearchParamsSchema } from "@/lib/invoices/schemas";
import {
  getInvoiceSyncConfiguration,
  getNextInvoiceSyncAt,
} from "@/lib/invoices/schedule";
import {
  getProviderOauthConfigurationMessage,
  isProviderOauthConfigured,
} from "@/lib/providers/configuration";
import { parseSearchParams } from "@/lib/server/http";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FactoringDashboardPage({ searchParams }: Props) {
  const user = await requireUser();
  const query = parseSearchParams(
    (await searchParams) ?? {},
    invoiceListSearchParamsSchema,
  );
  const [pandaDocConnection, quickBooksConnection] = await Promise.all([
    findUserConnection(user.id, Provider.PANDADOC),
    findUserConnection(user.id, Provider.QUICKBOOKS),
  ]);
  const [
    invoices,
    totalInvoices,
    eligibleInvoicesCount,
    recentTransactions,
    activeTransactionsCount,
    repaidTransactionsCount,
    capitalSource,
    sellerWalletBalance,
  ] = await Promise.all([
    listFactoringInvoicesForUser({
      userId: user.id,
      search: query.q,
      status: query.status,
      overdueOnly: query.overdue,
      page: query.page,
    }),
    countFactoringInvoicesForUser({
      userId: user.id,
      search: query.q,
      status: query.status,
      overdueOnly: query.overdue,
    }),
    countEligibleFactoringInvoicesForUser(user.id),
    listRecentFactoringTransactionsForUser(user.id, 6),
    countFactoringTransactionsByStatus({
      userId: user.id,
      statuses: [
        FactoringTransactionStatus.PENDING,
        FactoringTransactionStatus.FUNDED,
      ],
    }),
    countFactoringTransactionsByStatus({
      userId: user.id,
      statuses: [FactoringTransactionStatus.REPAID],
    }),
    getOrCreateManagedCapitalSource(),
    getWalletBalance({
      ownerType: LedgerOwnerType.SELLER,
      ownerId: user.id,
      currency: "USDC",
    }),
  ]);

  const latestSync = quickBooksConnection
    ? await getLatestSyncRun(quickBooksConnection.id)
    : null;
  const syncConfig = getInvoiceSyncConfiguration();
  const quickBooksConnected = quickBooksConnection?.status === "CONNECTED";
  const pandaDocConnected = pandaDocConnection?.status === "CONNECTED";
  const pandaDocImportEnabled = hasPandaDocImportConfig();
  const pandaDocConfigured = isProviderOauthConfigured(Provider.PANDADOC);
  const quickBooksConfigured = isProviderOauthConfigured(Provider.QUICKBOOKS);
  const nextScheduledSyncAt =
    quickBooksConnection && quickBooksConnected
      ? getNextInvoiceSyncAt(quickBooksConnection.lastSyncAt)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            PandaDoc embedded finance
          </p>
          <h1 className="text-4xl font-[var(--font-heading)] font-semibold tracking-tight">
            Working capital dashboard
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Review eligible invoices, keep connection setup out of the way, and
            focus the seller experience on immediate capital actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/integrations">Manage connections</Link>
          </Button>
          <SyncButton
            disabled={!quickBooksConnected}
            payload={
              quickBooksConnection
                ? { connectionId: quickBooksConnection.id, force: true }
                : undefined
            }
          />
        </div>
      </div>

      <FactoringSetupGuide
        pandaDocConnection={pandaDocConnection}
        quickBooksConnection={quickBooksConnection}
        pandaDocConfigured={pandaDocConfigured}
        quickBooksConfigured={quickBooksConfigured}
        providerMessages={{
          pandaDoc: getProviderOauthConfigurationMessage(Provider.PANDADOC),
          quickBooks: getProviderOauthConfigurationMessage(Provider.QUICKBOOKS),
        }}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Eligible invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="text-4xl font-semibold text-foreground">
              {eligibleInvoicesCount}
            </div>
            <p>
              Receivables with open status, future due date, and no active
              advance.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Capital received</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="text-2xl font-semibold text-foreground">
              {formatCurrency(sellerWalletBalance.toString(), "USDC")}
            </div>
            <p>Demo wallet balance credited after successful withdrawals.</p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Active advances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="text-4xl font-semibold text-foreground">
              {activeTransactionsCount}
            </div>
            <p>Funded invoices that are still waiting for repayment.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>Operational context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-5">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Funding capacity
            </span>
            <span className="mt-1 block font-medium text-foreground">
              {formatCurrency(
                capitalSource.availableLiquidity.toString(),
                "USDC",
              )}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Imported invoices
            </span>
            <span className="mt-1 block font-medium text-foreground">
              {totalInvoices}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Completed repayments
            </span>
            <span className="mt-1 block font-medium text-foreground">
              {repaidTransactionsCount}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Last sync
            </span>
            <span className="mt-1 block font-medium text-foreground">
              {formatDateTime(quickBooksConnection?.lastSyncAt)}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
              Next scheduled sync
            </span>
            <span className="mt-1 block font-medium text-foreground">
              {quickBooksConnected
                ? formatDateTime(nextScheduledSyncAt)
                : "Connect QuickBooks first"}
            </span>
          </div>
          <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/70 pt-4">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Periodic sync
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {syncConfig.enabled
                  ? `Enabled every ${syncConfig.intervalMinutes} minute(s)`
                  : "Disabled"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Latest run
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {latestSync
                  ? `${latestSync.status} at ${formatDateTime(latestSync.startedAt)}`
                  : "No sync runs recorded yet"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                PandaDoc import
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {pandaDocImportEnabled
                  ? "Ready"
                  : "Template configuration pending"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Connections
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {pandaDocConnected && quickBooksConnected
                  ? "PandaDoc + QuickBooks connected"
                  : "One or more connections pending"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Invoices
        </p>
        <div className="space-y-1">
          <h2 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">
            Imported receivables
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Keep attention on eligible invoices first. Secondary metadata stays
            inline instead of competing with the primary action.
          </p>
        </div>
      </div>

      <InvoiceFilters
        overdueOnly={query.overdue}
        search={query.q}
        status={query.status}
      />

      <InvoiceTable
        invoices={invoices}
        pandaDocConnected={pandaDocConnected}
        pandaDocImportEnabled={pandaDocImportEnabled}
        showPandaDocColumn={false}
      />

      <QueryPagination
        pathname="/factoring-dashboard"
        page={query.page}
        pageSize={20}
        totalItems={totalInvoices}
        searchParams={{
          q: query.q,
          status: query.status,
          overdue: query.overdue,
        }}
        label="invoices"
      />

      <RecentFactoringTransactions transactions={recentTransactions} />
    </div>
  );
}
