import { InvoiceStatus } from "@prisma/client";

import { normalizeInvoiceStatus } from "@/lib/invoices/normalize";

describe("normalizeInvoiceStatus", () => {
  const now = new Date("2026-03-06T12:00:00.000Z");

  it("returns PAID when balance is zero", () => {
    expect(
      normalizeInvoiceStatus({
        balanceAmount: 0,
        totalAmount: 100,
        dueDate: new Date("2026-03-01T00:00:00.000Z"),
        now,
      }),
    ).toBe(InvoiceStatus.PAID);
  });

  it("returns OVERDUE when due date is before today and balance remains", () => {
    expect(
      normalizeInvoiceStatus({
        balanceAmount: 100,
        totalAmount: 100,
        dueDate: new Date("2026-03-01T00:00:00.000Z"),
        now,
      }),
    ).toBe(InvoiceStatus.OVERDUE);
  });

  it("returns OPEN when due date is today or later and balance remains", () => {
    expect(
      normalizeInvoiceStatus({
        balanceAmount: 100,
        totalAmount: 100,
        dueDate: new Date("2026-03-06T00:00:00.000Z"),
        now,
      }),
    ).toBe(InvoiceStatus.OPEN);
  });

  it("returns PARTIALLY_PAID when balance is below total amount", () => {
    expect(
      normalizeInvoiceStatus({
        balanceAmount: 50,
        totalAmount: 100,
        dueDate: new Date("2026-03-01T00:00:00.000Z"),
        now,
      }),
    ).toBe(InvoiceStatus.PARTIALLY_PAID);
  });

  it("defaults missing due date to OPEN when balance remains", () => {
    expect(
      normalizeInvoiceStatus({
        balanceAmount: 100,
        totalAmount: 100,
        dueDate: null,
        now,
      }),
    ).toBe(InvoiceStatus.OPEN);
  });
});
