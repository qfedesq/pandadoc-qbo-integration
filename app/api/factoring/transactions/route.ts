import { SettlementMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { createFactoringTransactionForUser } from "@/lib/factoring/transactions";
import { logger } from "@/lib/logging/logger";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

const createFactoringTransactionSchema = z
  .object({
    importedInvoiceId: z.string().min(1),
    settlementMethod: z.nativeEnum(SettlementMethod),
    acceptTerms: z.boolean(),
    walletAddress: z.string().optional(),
    bankAccountLabel: z.string().optional(),
    debitCardLabel: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.settlementMethod === SettlementMethod.USDC_WALLET && !value.walletAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["walletAddress"],
        message: "Wallet address is required for USDC settlement.",
      });
    }

    if (value.settlementMethod === SettlementMethod.ACH && !value.bankAccountLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bankAccountLabel"],
        message: "Bank account label is required for ACH settlement.",
      });
    }

    if (value.settlementMethod === SettlementMethod.DEBIT_CARD && !value.debitCardLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["debitCardLabel"],
        message: "Debit card last four digits are required.",
      });
    }
  });

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    assertValidAppRequestOrigin(request);

    const rateLimit = await enforceRateLimit({
      key: `factoring:create:${user.id}:${getRequestIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached." },
        { status: 429 },
      );
    }

    const payload = createFactoringTransactionSchema.parse(await request.json());
    const result = await createFactoringTransactionForUser({
      userId: user.id,
      importedInvoiceId: payload.importedInvoiceId,
      settlementMethod: payload.settlementMethod,
      acceptTerms: payload.acceptTerms,
      walletAddress: payload.walletAddress,
      bankAccountLabel: payload.bankAccountLabel,
      debitCardLabel: payload.debitCardLabel,
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      redirectTo: `/factoring-dashboard/transactions/${result.transaction.id}`,
      transaction: {
        id: result.transaction.id,
        transactionReference: result.transaction.transactionReference,
        status: result.transaction.status,
      },
    });
  } catch (error) {
    logger.error("factoring.create_transaction_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.statusCode },
    );
  }
}
