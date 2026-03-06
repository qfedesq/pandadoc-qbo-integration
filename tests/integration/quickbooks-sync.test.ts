import { InvoiceStatus } from "@prisma/client";

import { syncQuickBooksOutstandingInvoices } from "@/lib/invoices/sync";
import openInvoice from "@/tests/fixtures/quickbooks.invoice.open.json";
import overdueInvoice from "@/tests/fixtures/quickbooks.invoice.overdue.json";
import paidInvoice from "@/tests/fixtures/quickbooks.invoice.paid.json";

describe("QuickBooks invoice sync", () => {
  it("imports outstanding invoices during an initial sync", async () => {
    const upsertInvoice = vi.fn().mockResolvedValue(undefined);
    const completeRun = vi.fn().mockResolvedValue(undefined);

    const result = await syncQuickBooksOutstandingInvoices(
      {
        getAccessContext: vi.fn().mockResolvedValue({
          accessToken: "access",
          realmId: "9130357992222222",
          company: { id: "company_1" },
          connection: {
            id: "connection_1",
            userId: "user_1",
            lastSyncAt: null,
          },
        }),
        fetchInvoices: vi.fn().mockResolvedValue([
          openInvoice,
          overdueInvoice,
          paidInvoice,
        ]),
        startRun: vi.fn().mockResolvedValue({ id: "run_1" }),
        completeRun,
        findExistingInvoices: vi.fn().mockResolvedValue([]),
        upsertInvoice,
        markSynced: vi.fn().mockResolvedValue(undefined),
        markConnectionError: vi.fn().mockResolvedValue(undefined),
      },
      {
        connectionId: "connection_1",
        trigger: "USER",
      },
    );

    expect(upsertInvoice).toHaveBeenCalledTimes(2);
    expect(upsertInvoice).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        providerInvoiceId: "9001",
        normalizedStatus: InvoiceStatus.OPEN,
      }),
    );
    expect(upsertInvoice).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        providerInvoiceId: "9002",
        normalizedStatus: InvoiceStatus.OVERDUE,
      }),
    );
    expect(result.upsertedCount).toBe(2);
    expect(completeRun).toHaveBeenCalledWith(
      "run_1",
      expect.objectContaining({
        status: "SUCCESS",
        skippedCount: 1,
      }),
    );
  });

  it("updates a previously imported invoice when it becomes paid on incremental sync", async () => {
    const upsertInvoice = vi.fn().mockResolvedValue(undefined);

    await syncQuickBooksOutstandingInvoices(
      {
        getAccessContext: vi.fn().mockResolvedValue({
          accessToken: "access",
          realmId: "9130357992222222",
          company: { id: "company_1" },
          connection: {
            id: "connection_1",
            userId: "user_1",
            lastSyncAt: new Date("2026-03-01T12:00:00.000Z"),
          },
        }),
        fetchInvoices: vi.fn().mockResolvedValue([paidInvoice]),
        startRun: vi.fn().mockResolvedValue({ id: "run_2" }),
        completeRun: vi.fn().mockResolvedValue(undefined),
        findExistingInvoices: vi.fn().mockResolvedValue([
          {
            id: "invoice_1",
            providerInvoiceId: "9004",
            normalizedStatus: InvoiceStatus.OPEN,
          },
        ]),
        upsertInvoice,
        markSynced: vi.fn().mockResolvedValue(undefined),
        markConnectionError: vi.fn().mockResolvedValue(undefined),
      },
      {
        connectionId: "connection_1",
        trigger: "USER",
      },
    );

    expect(upsertInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        providerInvoiceId: "9004",
        normalizedStatus: InvoiceStatus.PAID,
        balanceAmount: 0,
      }),
    );
  });

  it("deduplicates repeated invoice ids within the same sync batch", async () => {
    const upsertInvoice = vi.fn().mockResolvedValue(undefined);

    const result = await syncQuickBooksOutstandingInvoices(
      {
        getAccessContext: vi.fn().mockResolvedValue({
          accessToken: "access",
          realmId: "9130357992222222",
          company: { id: "company_1" },
          connection: {
            id: "connection_1",
            userId: "user_1",
            lastSyncAt: null,
          },
        }),
        fetchInvoices: vi.fn().mockResolvedValue([openInvoice, openInvoice]),
        startRun: vi.fn().mockResolvedValue({ id: "run_3" }),
        completeRun: vi.fn().mockResolvedValue(undefined),
        findExistingInvoices: vi.fn().mockResolvedValue([]),
        upsertInvoice,
        markSynced: vi.fn().mockResolvedValue(undefined),
        markConnectionError: vi.fn().mockResolvedValue(undefined),
      },
      {
        connectionId: "connection_1",
        trigger: "USER",
      },
    );

    expect(upsertInvoice).toHaveBeenCalledTimes(1);
    expect(result.upsertedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });
});
