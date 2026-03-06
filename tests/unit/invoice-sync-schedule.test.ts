import {
  getNextInvoiceSyncAt,
  isConnectionDueForScheduledSync,
} from "@/lib/invoices/schedule";

describe("invoice sync schedule helpers", () => {
  const now = new Date("2026-03-06T12:00:00.000Z");

  it("treats never-synced connections as immediately due", () => {
    expect(isConnectionDueForScheduledSync(null, now, 60)).toBe(true);
    expect(getNextInvoiceSyncAt(null, now, 60)).toEqual(now);
  });

  it("marks a connection due once the configured interval has elapsed", () => {
    const lastSyncAt = new Date("2026-03-06T10:30:00.000Z");

    expect(isConnectionDueForScheduledSync(lastSyncAt, now, 60)).toBe(true);
    expect(getNextInvoiceSyncAt(lastSyncAt, now, 60).toISOString()).toBe(
      "2026-03-06T11:30:00.000Z",
    );
  });

  it("does not mark a connection due before the interval elapses", () => {
    const lastSyncAt = new Date("2026-03-06T11:30:01.000Z");

    expect(isConnectionDueForScheduledSync(lastSyncAt, now, 60)).toBe(false);
  });
});
