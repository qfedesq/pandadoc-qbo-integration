import { addMinutes, subMinutes } from "date-fns";

import { env } from "@/lib/env";

export function getInvoiceSyncConfiguration() {
  return {
    enabled: env.INVOICE_SYNC_ENABLED,
    intervalMinutes: env.INVOICE_SYNC_INTERVAL_MINUTES,
  };
}

export function getInvoiceSyncDueThreshold(
  now = new Date(),
  intervalMinutes = env.INVOICE_SYNC_INTERVAL_MINUTES,
) {
  return subMinutes(now, intervalMinutes);
}

export function getNextInvoiceSyncAt(
  lastSyncAt: Date | null | undefined,
  now = new Date(),
  intervalMinutes = env.INVOICE_SYNC_INTERVAL_MINUTES,
) {
  if (!lastSyncAt) {
    return now;
  }

  return addMinutes(lastSyncAt, intervalMinutes);
}

export function isConnectionDueForScheduledSync(
  lastSyncAt: Date | null | undefined,
  now = new Date(),
  intervalMinutes = env.INVOICE_SYNC_INTERVAL_MINUTES,
) {
  return getNextInvoiceSyncAt(lastSyncAt, now, intervalMinutes) <= now;
}
