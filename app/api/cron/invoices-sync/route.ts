import { NextResponse } from "next/server";
import { z } from "zod";

import { runConfiguredInvoiceSync } from "@/lib/invoices/scheduled-sync";
import { logger } from "@/lib/logging/logger";
import { isAuthorizedSyncRequest } from "@/lib/security/sync-auth";
import { getPublicError } from "@/lib/utils/errors";

const cronSyncQuerySchema = z.object({
  connectionId: z.string().min(1).optional(),
  force: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => value === "true" || value === "1"),
  userId: z.string().min(1).optional(),
});

function parseCronSyncQuery(request: Request) {
  const url = new URL(request.url);

  return cronSyncQuerySchema.parse({
    connectionId: url.searchParams.get("connectionId") ?? undefined,
    force: url.searchParams.get("force") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
  });
}

export async function GET(request: Request) {
  if (!isAuthorizedSyncRequest(request, "vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const query = parseCronSyncQuery(request);
    const execution = await runConfiguredInvoiceSync({
      connectionId: query.connectionId,
      force: query.force,
      trigger: "CRON",
      userId: query.userId,
    });

    return NextResponse.json({
      ok: true,
      source: "vercel-cron",
      ...execution,
    });
  } catch (error) {
    logger.error("quickbooks.vercel_cron_sync_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
