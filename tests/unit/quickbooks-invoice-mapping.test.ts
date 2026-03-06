import { InvoiceStatus } from "@prisma/client";

import { mapQuickBooksInvoice } from "@/lib/invoices/map";
import openInvoice from "@/tests/fixtures/quickbooks.invoice.open.json";
import partialInvoice from "@/tests/fixtures/quickbooks.invoice.partial.json";

describe("mapQuickBooksInvoice", () => {
  const now = new Date("2026-03-06T12:00:00.000Z");

  it("maps a fully open invoice into the normalized internal model", () => {
    const mapped = mapQuickBooksInvoice(openInvoice, now);

    expect(mapped).toMatchObject({
      providerInvoiceId: "9001",
      docNumber: "INV-9001",
      totalAmount: 1250,
      balanceAmount: 1250,
      currency: "USD",
      counterpartyName: "Acme Holdings",
      counterpartyEmail: "billing@acme.example",
      normalizedStatus: InvoiceStatus.OPEN,
    });
    expect(mapped.dueDate?.toISOString()).toBe("2026-03-20T00:00:00.000Z");
    expect(mapped.txnDate?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(mapped.createdTime?.toISOString()).toBe("2026-03-01T10:00:00.000Z");
    expect(mapped.updatedTime?.toISOString()).toBe("2026-03-01T11:00:00.000Z");
    expect(mapped.rawPayload.Id).toBe("9001");
  });

  it("preserves partial payment semantics when balance is below total", () => {
    const mapped = mapQuickBooksInvoice(partialInvoice, now);

    expect(mapped.totalAmount).toBe(2400);
    expect(mapped.balanceAmount).toBe(600);
    expect(mapped.counterpartyName).toBe("Globex Corporation");
    expect(mapped.counterpartyEmail).toBe("finance@globex.example");
    expect(mapped.normalizedStatus).toBe(InvoiceStatus.PARTIALLY_PAID);
  });
});
