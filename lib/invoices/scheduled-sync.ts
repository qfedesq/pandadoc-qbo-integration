import { type SyncTrigger } from "@prisma/client";

import { syncQueue, type SyncQueue } from "@/lib/jobs/sync-queue";
import { logger } from "@/lib/logging/logger";

import { getInvoiceSyncConfiguration } from "./schedule";

export type InvoiceSyncJobResult = {
  connectionId: string;
  runId: string;
  fetchedCount: number;
  processedCount: number;
  upsertedCount: number;
  skippedCount: number;
  errorCount: number;
};

type RunInvoiceSyncDeps = {
  queue?: SyncQueue;
  config?: {
    enabled: boolean;
    intervalMinutes: number;
  };
};

export type RunInvoiceSyncInput = {
  connectionId?: string;
  userId?: string;
  force?: boolean;
  trigger: SyncTrigger;
  now?: Date;
};

export type RunInvoiceSyncResult = {
  enabled: boolean;
  intervalMinutes: number;
  dueOnly: boolean;
  results: InvoiceSyncJobResult[];
  skippedReason?: "INVOICE_SYNC_DISABLED";
};

export async function runInvoiceSync(
  deps: RunInvoiceSyncDeps,
  input: RunInvoiceSyncInput,
): Promise<RunInvoiceSyncResult> {
  const queue = deps.queue ?? syncQueue;
  const config = deps.config ?? getInvoiceSyncConfiguration();
  const isScheduledTrigger = input.trigger !== "USER";
  const dueOnly = isScheduledTrigger && !input.force;

  if (isScheduledTrigger && !config.enabled) {
    logger.info("quickbooks.scheduled_sync_skipped", {
      reason: "INVOICE_SYNC_DISABLED",
      trigger: input.trigger,
    });

    return {
      enabled: false,
      intervalMinutes: config.intervalMinutes,
      dueOnly,
      results: [],
      skippedReason: "INVOICE_SYNC_DISABLED",
    };
  }

  const results = await queue.enqueueQuickBooksSync({
    connectionId: input.connectionId,
    userId: input.userId,
    trigger: input.trigger,
    dueOnly,
    now: input.now,
    intervalMinutes: config.intervalMinutes,
  });

  return {
    enabled: config.enabled,
    intervalMinutes: config.intervalMinutes,
    dueOnly,
    results,
  };
}

export async function runConfiguredInvoiceSync(input: RunInvoiceSyncInput) {
  return runInvoiceSync({}, input);
}
