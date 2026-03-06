import { QuickBooksInvoice, quickBooksInvoiceSchema } from "@/lib/providers/quickbooks/schemas";
import { toPrismaInputJsonObject } from "@/lib/utils/prisma-json";

import { normalizeInvoiceStatus } from "./normalize";

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export function isOutstandingInvoice(invoice: QuickBooksInvoice | { Balance: number }) {
  return Number(invoice.Balance) > 0;
}

export function mapQuickBooksInvoice(invoiceInput: QuickBooksInvoice, now = new Date()) {
  const invoice = quickBooksInvoiceSchema.parse(invoiceInput);
  const dueDate = parseDate(invoice.DueDate);
  const txnDate = parseDate(invoice.TxnDate);
  const createdTime = parseDate(invoice.MetaData?.CreateTime ?? null);
  const updatedTime = parseDate(invoice.MetaData?.LastUpdatedTime ?? null);
  const totalAmount = Number(invoice.TotalAmt);
  const balanceAmount = Number(invoice.Balance);
  const counterpartyName =
    invoice.CustomerRef?.name ??
    invoice.BillEmail?.Address ??
    "Unknown counterparty";
  const counterpartyEmail = invoice.BillEmail?.Address ?? null;

  return {
    providerInvoiceId: invoice.Id,
    docNumber: invoice.DocNumber ?? invoice.Id,
    totalAmount,
    balanceAmount,
    currency:
      invoice.CurrencyRef?.value ?? invoice.CurrencyRef?.name ?? "USD",
    dueDate,
    issueDate: txnDate,
    txnDate,
    createdTime,
    updatedTime,
    counterpartyName,
    counterpartyEmail,
    normalizedStatus: normalizeInvoiceStatus({
      balanceAmount,
      totalAmount,
      dueDate,
      now,
    }),
    rawPayload: toPrismaInputJsonObject(invoice),
  };
}
