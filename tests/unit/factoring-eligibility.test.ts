import {
  FactoringTransactionStatus,
  InvoiceStatus,
} from "@prisma/client";

import { evaluateFactoringEligibility } from "@/lib/factoring/eligibility";

describe("evaluateFactoringEligibility", () => {
  it("marks open invoices with due dates as eligible", () => {
    expect(
      evaluateFactoringEligibility({
        balanceAmount: "1250.00",
        dueDate: new Date("2026-03-20T00:00:00.000Z"),
        normalizedStatus: InvoiceStatus.OPEN,
        transactions: [],
      }),
    ).toEqual({
      eligible: true,
      status: "ELIGIBLE",
      reason: null,
      activeTransactionStatus: null,
    });
  });

  it("rejects overdue invoices for the Tier 1 pool", () => {
    expect(
      evaluateFactoringEligibility({
        balanceAmount: "980.00",
        dueDate: new Date("2026-02-20T00:00:00.000Z"),
        normalizedStatus: InvoiceStatus.OVERDUE,
        transactions: [],
      }),
    ).toMatchObject({
      eligible: false,
      status: "INELIGIBLE",
      reason: "Overdue invoices are not eligible for the Tier 1 managed pool.",
    });
  });

  it("rejects invoices with an active factoring transaction", () => {
    expect(
      evaluateFactoringEligibility({
        balanceAmount: "600.00",
        dueDate: new Date("2026-03-15T00:00:00.000Z"),
        normalizedStatus: InvoiceStatus.PARTIALLY_PAID,
        transactions: [{ status: FactoringTransactionStatus.PENDING }],
      }),
    ).toMatchObject({
      eligible: false,
      status: "INELIGIBLE",
      activeTransactionStatus: FactoringTransactionStatus.PENDING,
    });
  });

  it("rejects invoices without a due date", () => {
    expect(
      evaluateFactoringEligibility({
        balanceAmount: "500.00",
        dueDate: null,
        normalizedStatus: InvoiceStatus.OPEN,
        transactions: [],
      }),
    ).toMatchObject({
      eligible: false,
      status: "INELIGIBLE",
      reason:
        "A due date is required before the invoice can enter the factoring pool.",
    });
  });
});
