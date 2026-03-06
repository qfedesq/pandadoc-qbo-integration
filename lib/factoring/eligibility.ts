import {
  FactoringEligibilityStatus,
  FactoringTransactionStatus,
  InvoiceStatus,
} from "@prisma/client";

type Decimalish = number | string | { toString(): string } | null | undefined;

export type FactoringEligibilityInput = {
  balanceAmount: Decimalish;
  dueDate?: Date | null;
  normalizedStatus: InvoiceStatus;
  transactions?: Array<{
    status: FactoringTransactionStatus;
  }>;
};

export type FactoringEligibilityResult = {
  eligible: boolean;
  status: FactoringEligibilityStatus;
  reason: string | null;
  activeTransactionStatus: FactoringTransactionStatus | null;
};

function toNumber(value: Decimalish) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(numeric) ? numeric : 0;
}

export function isActiveFactoringTransactionStatus(
  status: FactoringTransactionStatus,
) {
  return (
    status === FactoringTransactionStatus.PENDING ||
    status === FactoringTransactionStatus.FUNDED
  );
}

export function evaluateFactoringEligibility(
  input: FactoringEligibilityInput,
): FactoringEligibilityResult {
  const activeTransactionStatus =
    input.transactions?.find((transaction) =>
      isActiveFactoringTransactionStatus(transaction.status),
    )?.status ?? null;

  if (activeTransactionStatus) {
    return {
      eligible: false,
      status: FactoringEligibilityStatus.INELIGIBLE,
      reason: "An active capital advance already exists for this invoice.",
      activeTransactionStatus,
    };
  }

  if (toNumber(input.balanceAmount) <= 0 || input.normalizedStatus === InvoiceStatus.PAID) {
    return {
      eligible: false,
      status: FactoringEligibilityStatus.INELIGIBLE,
      reason: "Only outstanding invoices with a positive balance can receive funding.",
      activeTransactionStatus: null,
    };
  }

  if (!input.dueDate) {
    return {
      eligible: false,
      status: FactoringEligibilityStatus.INELIGIBLE,
      reason: "A due date is required before the invoice can be reviewed for funding.",
      activeTransactionStatus: null,
    };
  }

  if (input.normalizedStatus === InvoiceStatus.OVERDUE) {
    return {
      eligible: false,
      status: FactoringEligibilityStatus.INELIGIBLE,
      reason: "Overdue invoices are not eligible for this funding program.",
      activeTransactionStatus: null,
    };
  }

  return {
    eligible: true,
    status: FactoringEligibilityStatus.ELIGIBLE,
    reason: null,
    activeTransactionStatus: null,
  };
}
