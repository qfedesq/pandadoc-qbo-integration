import { SyncTrigger } from "@prisma/client";

import { getQuickBooksConnectionsForSync } from "@/lib/db/integrations";
import { syncQuickBooksOutstandingInvoicesForConnection } from "@/lib/invoices/sync";

export type QueueSyncRequest = {
  connectionId?: string;
  userId?: string;
  trigger: SyncTrigger;
  dueOnly?: boolean;
  now?: Date;
  intervalMinutes?: number;
};

export interface SyncQueue {
  enqueueQuickBooksSync(input: QueueSyncRequest): Promise<
    Array<{
      connectionId: string;
      runId: string;
      fetchedCount: number;
      processedCount: number;
      upsertedCount: number;
      skippedCount: number;
      errorCount: number;
    }>
  >;
}

class InlineSyncQueue implements SyncQueue {
  async enqueueQuickBooksSync(input: QueueSyncRequest) {
    const connections = await getQuickBooksConnectionsForSync({
      connectionId: input.connectionId,
      userId: input.userId,
      dueOnly: input.dueOnly,
      now: input.now,
      intervalMinutes: input.intervalMinutes,
    });

    const results: Awaited<ReturnType<SyncQueue["enqueueQuickBooksSync"]>> = [];

    for (const connection of connections) {
      const summary = await syncQuickBooksOutstandingInvoicesForConnection(
        connection.id,
        input.trigger,
      );

      results.push({
        connectionId: connection.id,
        ...summary,
      });
    }

    return results;
  }
}

export const syncQueue: SyncQueue = new InlineSyncQueue();
