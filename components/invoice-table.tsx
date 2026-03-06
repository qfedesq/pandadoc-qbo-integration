import type { Prisma } from "@prisma/client";

import { ImportToPandaDocButton } from "@/components/import-to-pandadoc-button";
import { PandaDocStatusBadge } from "@/components/pandadoc-status-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type FactoringInvoiceRow = Prisma.ImportedInvoiceGetPayload<{
  include: {
    documentLinks: true;
  };
}>;

export function InvoiceTable({
  invoices,
  pandaDocConnected = false,
  pandaDocImportEnabled = false,
}: {
  invoices: FactoringInvoiceRow[];
  pandaDocConnected?: boolean;
  pandaDocImportEnabled?: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-white/70 p-10 text-center text-sm text-muted-foreground">
        No invoices match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-white/85 shadow-panel">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice ID</TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>PandaDoc</TableHead>
            <TableHead>Last synced</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const link = invoice.documentLinks[0] ?? null;
            const disabledReason = !pandaDocConnected
              ? "Connect PandaDoc first."
              : !pandaDocImportEnabled
                ? "Configure the PandaDoc import template first."
                : !invoice.counterpartyEmail
                  ? "QuickBooks invoice has no payer email."
                  : null;

            return (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{invoice.providerInvoiceId}</div>
                  <div className="text-xs text-muted-foreground">{invoice.docNumber ?? "—"}</div>
                </TableCell>
                <TableCell>
                  <div>{invoice.counterpartyName}</div>
                  <div className="text-xs text-muted-foreground">
                    {invoice.counterpartyEmail ?? "No payer email"}
                  </div>
                </TableCell>
                <TableCell>
                  {formatCurrency(invoice.balanceAmount.toString(), invoice.currency ?? "USD")}
                </TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>
                  <StatusBadge status={invoice.normalizedStatus} />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <PandaDocStatusBadge status={link?.pandadocDocumentStatus} />
                    {link?.documentName ? (
                      <div className="max-w-48 text-xs text-muted-foreground">
                        {link.documentName}
                      </div>
                    ) : null}
                    {link?.lastError ? (
                      <div className="max-w-56 text-xs text-rose-700">{link.lastError}</div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(invoice.lastSyncedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <ImportToPandaDocButton
                      importedInvoiceId={invoice.id}
                      documentStatus={link?.pandadocDocumentStatus}
                      disabledReason={disabledReason}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
