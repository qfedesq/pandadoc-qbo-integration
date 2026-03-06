import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { assertSecureCronConfiguration, env } from "@/lib/env";
import { runConfiguredInvoiceSync } from "@/lib/invoices/scheduled-sync";
import { logger } from "@/lib/logging/logger";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

const syncRequestSchema = z
  .object({
    connectionId: z.string().optional(),
    userId: z.string().optional(),
    force: z.boolean().optional(),
  })
  .strict();

function isAuthorizedCronRequest(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  assertSecureCronConfiguration();
  return authHeader === `Bearer ${env.INTERNAL_SYNC_SECRET}`;
}

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  const cronAuthorized = isAuthorizedCronRequest(request);

  if (!user && !cronAuthorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    if (!cronAuthorized) {
      assertValidAppRequestOrigin(request);
    }

    const rateLimit = await enforceRateLimit({
      key: `sync:${user?.id ?? getRequestIp(request)}`,
      limit: cronAuthorized ? 120 : 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached." },
        { status: 429 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    const parsedBody = contentType.includes("application/json")
      ? syncRequestSchema.parse(await request.json())
      : {};

    const execution = await runConfiguredInvoiceSync({
      connectionId: parsedBody.connectionId,
      userId: user?.id ?? parsedBody.userId,
      force: parsedBody.force,
      trigger: user ? "USER" : "CRON",
    });

    return NextResponse.json({
      ok: true,
      ...execution,
    });
  } catch (error) {
    logger.error("quickbooks.sync_endpoint_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
