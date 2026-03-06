import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { transitionFactoringTransactionForUser } from "@/lib/factoring/transactions";
import { logger } from "@/lib/logging/logger";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

const transactionParamsSchema = z.object({
  transactionId: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ transactionId: string }> },
) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    assertValidAppRequestOrigin(request);

    const rateLimit = await enforceRateLimit({
      key: `factoring:fund:${user.id}:${getRequestIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached." },
        { status: 429 },
      );
    }

    const params = transactionParamsSchema.parse(await context.params);
    const transaction = await transitionFactoringTransactionForUser({
      userId: user.id,
      transactionId: params.transactionId,
      targetStatus: "FUNDED",
    });

    return NextResponse.json({
      ok: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
      },
    });
  } catch (error) {
    logger.error("factoring.mark_funded_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
