import { runInvoiceSync } from "@/lib/invoices/scheduled-sync";

describe("runInvoiceSync", () => {
  it("skips scheduled sync when periodic sync is disabled", async () => {
    const queue = {
      enqueueQuickBooksSync: vi.fn(),
    };

    const result = await runInvoiceSync(
      {
        queue,
        config: {
          enabled: false,
          intervalMinutes: 30,
        },
      },
      {
        trigger: "CRON",
      },
    );

    expect(queue.enqueueQuickBooksSync).not.toHaveBeenCalled();
    expect(result).toEqual({
      enabled: false,
      intervalMinutes: 30,
      dueOnly: true,
      results: [],
      skippedReason: "INVOICE_SYNC_DISABLED",
    });
  });

  it("uses due-only selection for scheduled sync runs", async () => {
    const queue = {
      enqueueQuickBooksSync: vi.fn().mockResolvedValue([]),
    };

    await runInvoiceSync(
      {
        queue,
        config: {
          enabled: true,
          intervalMinutes: 45,
        },
      },
      {
        trigger: "CRON",
        userId: "user_1",
      },
    );

    expect(queue.enqueueQuickBooksSync).toHaveBeenCalledWith({
      connectionId: undefined,
      dueOnly: true,
      intervalMinutes: 45,
      now: undefined,
      trigger: "CRON",
      userId: "user_1",
    });
  });

  it("forces immediate sync for user-triggered runs", async () => {
    const queue = {
      enqueueQuickBooksSync: vi.fn().mockResolvedValue([]),
    };

    await runInvoiceSync(
      {
        queue,
        config: {
          enabled: true,
          intervalMinutes: 15,
        },
      },
      {
        trigger: "USER",
        connectionId: "connection_1",
      },
    );

    expect(queue.enqueueQuickBooksSync).toHaveBeenCalledWith({
      connectionId: "connection_1",
      dueOnly: false,
      intervalMinutes: 15,
      now: undefined,
      trigger: "USER",
      userId: undefined,
    });
  });
});
