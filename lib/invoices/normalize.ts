import { InvoiceStatus } from "@prisma/client";

import { toDateOnly } from "@/lib/utils";

type NormalizeStatusInput = {
  balanceAmount: number;
  totalAmount: number;
  dueDate?: Date | null;
  now?: Date;
};

export function normalizeInvoiceStatus(input: NormalizeStatusInput) {
  if (input.balanceAmount <= 0) {
    return InvoiceStatus.PAID;
  }

  if (input.balanceAmount > 0 && input.balanceAmount < input.totalAmount) {
    return InvoiceStatus.PARTIALLY_PAID;
  }

  if (input.dueDate) {
    const today = toDateOnly(input.now ?? new Date());
    const dueDate = toDateOnly(input.dueDate);

    if (dueDate < today) {
      return InvoiceStatus.OVERDUE;
    }
  }

  return InvoiceStatus.OPEN;
}
