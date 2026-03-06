import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { importInvoiceToPandaDocForUser } from "@/lib/pandadoc/import-invoice";
import { logger } from "@/lib/logging/logger";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

const importRequestSchema = z
  .object({
    importedInvoiceId: z.string().min(1),
    sendImmediately: z.boolean().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    assertValidAppRequestOrigin(request);

    const rateLimit = await enforceRateLimit({
      key: `pandadoc:import:${user.id}:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached." },
        { status: 429 },
      );
    }

    const payload = importRequestSchema.parse(await request.json());
    const result = await importInvoiceToPandaDocForUser({
      userId: user.id,
      importedInvoiceId: payload.importedInvoiceId,
      sendImmediately: payload.sendImmediately,
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      sendRequested: result.sendRequested,
      sendInitiated: result.sendInitiated,
      link: {
        id: result.link.id,
        pandadocDocumentId: result.link.pandadocDocumentId,
        pandadocDocumentStatus: result.link.pandadocDocumentStatus,
        documentName: result.link.documentName,
        sentAt: result.link.sentAt,
        lastError: result.link.lastError,
      },
    });
  } catch (error) {
    logger.error("pandadoc.import_invoice_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
