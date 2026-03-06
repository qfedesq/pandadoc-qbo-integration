import {
  FactoringEventType,
  FactoringTransactionStatus,
  OnChainExecutionStatus,
  SettlementMethod,
  type Prisma,
} from "@prisma/client";

import { arenaStafiGateway } from "@/lib/arena-stafi/gateway";
import {
  getFactoringInvoiceForUser,
  getFactoringTransactionForUser,
  getOrCreateManagedCapitalSource,
  upsertFactoringOffer,
} from "@/lib/db/factoring";
import { prisma } from "@/lib/db/prisma";
import { evaluateFactoringEligibility } from "@/lib/factoring/eligibility";
import { calculateFactoringOffer, getSettlementMethodDetail } from "@/lib/factoring/offers";
import { DEFAULT_MARKETPLACE_NODE, getAccountingSystemForProvider } from "@/lib/factoring/marketplace";
import { logger } from "@/lib/logging/logger";
import { createOpaqueToken } from "@/lib/security/hash";
import { AppError } from "@/lib/utils/errors";

type DestinationInput = {
  walletAddress?: string;
  bankAccountLabel?: string;
  debitCardLabel?: string;
};

type CreateFactoringTransactionInput = DestinationInput & {
  userId: string;
  importedInvoiceId: string;
  settlementMethod: SettlementMethod;
  acceptTerms: boolean;
};

type TransitionFactoringTransactionInput = {
  userId: string;
  transactionId: string;
  targetStatus: "FUNDED" | "REPAID";
};

type TransactionDeps = {
  getInvoice: typeof getFactoringInvoiceForUser;
  getCapitalSource: typeof getOrCreateManagedCapitalSource;
  upsertOffer: typeof upsertFactoringOffer;
  prepareSettlement: typeof arenaStafiGateway.prepareSettlement;
};

const createTransactionDeps: TransactionDeps = {
  getInvoice: getFactoringInvoiceForUser,
  getCapitalSource: getOrCreateManagedCapitalSource,
  upsertOffer: upsertFactoringOffer,
  prepareSettlement: arenaStafiGateway.prepareSettlement,
};

function sanitizeDestinationLabel(value: string | undefined) {
  return value?.trim() ?? "";
}

function maskWalletAddress(value: string) {
  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeLastFour(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 4) {
    throw new AppError(
      "Provide at least the last four digits for the selected settlement method.",
      400,
      "INVALID_SETTLEMENT_DESTINATION",
    );
  }

  return digits.slice(-4);
}

function buildSettlementDestination(
  method: SettlementMethod,
  input: DestinationInput,
) {
  if (method === SettlementMethod.USDC_WALLET) {
    const walletAddress = sanitizeDestinationLabel(input.walletAddress);

    if (walletAddress.length < 10) {
      throw new AppError(
        "A wallet address is required for USDC settlement.",
        400,
        "INVALID_SETTLEMENT_DESTINATION",
      );
    }

    return {
      settlementDestinationMasked: `Wallet ${maskWalletAddress(walletAddress)}`,
      sellerWalletAddress: walletAddress,
      metadata: {
        destinationType: "wallet",
      } satisfies Prisma.InputJsonObject,
    };
  }

  if (method === SettlementMethod.ACH) {
    const lastFour = normalizeLastFour(
      sanitizeDestinationLabel(input.bankAccountLabel),
    );

    return {
      settlementDestinationMasked: `ACH ••${lastFour}`,
      sellerWalletAddress: null,
      metadata: {
        destinationType: "ach",
        bankAccountLast4: lastFour,
      } satisfies Prisma.InputJsonObject,
    };
  }

  const lastFour = normalizeLastFour(sanitizeDestinationLabel(input.debitCardLabel));

  return {
    settlementDestinationMasked: `Debit card ••${lastFour}`,
    sellerWalletAddress: null,
    metadata: {
      destinationType: "debit-card",
      debitCardLast4: lastFour,
    } satisfies Prisma.InputJsonObject,
  };
}

function buildTransactionReference() {
  return `FACT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${createOpaqueToken(6).toUpperCase()}`;
}

function offerChanged(
  existing: {
    eligibilityStatus: string;
    ineligibilityReason: string | null;
    grossAmount: { toString(): string };
    discountRateBps: number;
    discountAmount: { toString(): string };
    netProceeds: { toString(): string };
  } | null,
  calculated: ReturnType<typeof calculateFactoringOffer>,
) {
  if (!existing) {
    return true;
  }

  return (
    existing.eligibilityStatus !== calculated.eligibility.status ||
    existing.ineligibilityReason !== calculated.eligibility.reason ||
    existing.grossAmount.toString() !== calculated.grossAmount.toFixed(2) ||
    existing.discountRateBps !== calculated.discountRateBps ||
    existing.discountAmount.toString() !== calculated.discountAmount.toFixed(2) ||
    existing.netProceeds.toString() !== calculated.netProceeds.toFixed(2)
  );
}

export async function ensureFactoringOffer(
  deps: Pick<TransactionDeps, "getInvoice" | "getCapitalSource" | "upsertOffer">,
  input: {
    userId: string;
    importedInvoiceId: string;
  },
) {
  const [invoice, capitalSource] = await Promise.all([
    deps.getInvoice(input),
    deps.getCapitalSource(),
  ]);

  if (!invoice) {
    throw new AppError("Imported invoice not found.", 404, "INVOICE_NOT_FOUND");
  }

  const calculated = calculateFactoringOffer(
    {
      importedInvoiceId: invoice.id,
      providerInvoiceId: invoice.providerInvoiceId,
      docNumber: invoice.docNumber,
      counterpartyName: invoice.counterpartyName,
      normalizedStatus: invoice.normalizedStatus,
      balanceAmount: invoice.balanceAmount,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      issueDate: invoice.issueDate,
      transactions: invoice.factoringTransactions,
    },
    capitalSource,
  );

  const offer = await deps.upsertOffer({
    userId: input.userId,
    importedInvoiceId: invoice.id,
    capitalSourceId: capitalSource.id,
    marketplaceNode: DEFAULT_MARKETPLACE_NODE,
    accountingSystem: getAccountingSystemForProvider(invoice.provider),
    eligibilityStatus: calculated.eligibility.status,
    ineligibilityReason: calculated.eligibility.reason,
    grossAmount: calculated.grossAmount.toFixed(2),
    discountRateBps: calculated.discountRateBps,
    discountAmount: calculated.discountAmount.toFixed(2),
    netProceeds: calculated.netProceeds.toFixed(2),
    settlementCurrency: calculated.settlementCurrency,
    settlementTimeSummary: calculated.settlementTimeSummary,
    termsSnapshot: calculated.termsSnapshot,
    generatedAt: new Date(),
  });

  if (offerChanged(invoice.factoringOffer, calculated)) {
    await prisma.factoringEventLog.create({
      data: {
        userId: input.userId,
        importedInvoiceId: invoice.id,
        eventType: FactoringEventType.OFFER_GENERATED,
        message: calculated.eligibility.eligible
          ? "Factoring terms refreshed for the invoice."
          : `Offer refreshed but the invoice remains ineligible: ${calculated.eligibility.reason}`,
        metadata: {
          discountRateBps: calculated.discountRateBps,
          netProceeds: calculated.netProceeds,
          eligibilityStatus: calculated.eligibility.status,
        },
      },
    });
  }

  return {
    invoice,
    capitalSource,
    offer,
    calculated,
  };
}

export async function ensureFactoringOfferForUser(input: {
  userId: string;
  importedInvoiceId: string;
}) {
  return ensureFactoringOffer(createTransactionDeps, input);
}

export async function createFactoringTransaction(
  deps: TransactionDeps,
  input: CreateFactoringTransactionInput,
) {
  if (!input.acceptTerms) {
    throw new AppError(
      "You must accept the factoring terms before continuing.",
      400,
      "TERMS_NOT_ACCEPTED",
    );
  }

  const { invoice, capitalSource, offer, calculated } =
    await ensureFactoringOffer(deps, {
      userId: input.userId,
      importedInvoiceId: input.importedInvoiceId,
    });

  const eligibility = evaluateFactoringEligibility({
    balanceAmount: invoice.balanceAmount,
    dueDate: invoice.dueDate,
    normalizedStatus: invoice.normalizedStatus,
    transactions: invoice.factoringTransactions,
  });

  if (!eligibility.eligible || !calculated.eligibility.eligible) {
    throw new AppError(
      calculated.eligibility.reason ??
        eligibility.reason ??
        "This invoice is not eligible for factoring.",
      409,
      "INVOICE_NOT_ELIGIBLE",
    );
  }

  const settlement = buildSettlementDestination(input.settlementMethod, input);
  const transactionReference = buildTransactionReference();
  const settlementMethod = getSettlementMethodDetail(input.settlementMethod);
  const preparedSettlement = deps.prepareSettlement({
    importedInvoiceId: invoice.id,
    transactionReference,
    settlementMethod: input.settlementMethod,
    netProceeds: calculated.netProceeds,
    destinationMasked: settlement.settlementDestinationMasked,
  });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.factoringTransaction.findFirst({
      where: {
        userId: input.userId,
        importedInvoiceId: invoice.id,
        status: {
          in: [FactoringTransactionStatus.PENDING, FactoringTransactionStatus.FUNDED],
        },
      },
      include: {
        importedInvoice: {
          include: {
            documentLinks: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        factoringOffer: true,
        capitalSource: true,
        events: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existing) {
      return {
        created: false,
        transaction: existing,
      };
    }

    const transaction = await tx.factoringTransaction.create({
      data: {
        transactionReference,
        userId: input.userId,
        importedInvoiceId: invoice.id,
        factoringOfferId: offer.id,
        capitalSourceId: capitalSource.id,
        marketplaceNode: DEFAULT_MARKETPLACE_NODE,
        accountingSystem: getAccountingSystemForProvider(invoice.provider),
        status: FactoringTransactionStatus.PENDING,
        settlementMethod: input.settlementMethod,
        settlementDestinationMasked: settlement.settlementDestinationMasked,
        sellerWalletAddress: settlement.sellerWalletAddress,
        invoiceCurrency: invoice.currency,
        settlementCurrency: calculated.settlementCurrency,
        grossAmount: calculated.grossAmount.toFixed(2),
        discountRateBps: calculated.discountRateBps,
        discountAmount: calculated.discountAmount.toFixed(2),
        netProceeds: calculated.netProceeds.toFixed(2),
        settlementTimeLabel: settlementMethod.settlementTimeLabel,
        termsAcceptedAt: new Date(),
        operatorWallet: preparedSettlement.operatorWallet,
        arenaSettlementReference: preparedSettlement.settlementReference,
        onChainExecutionStatus: preparedSettlement.onChainExecutionStatus,
        metadata: {
          ...settlement.metadata,
          capitalSourceKey: preparedSettlement.capitalSourceKey,
          network: preparedSettlement.network,
          simulation: true,
        },
      },
      include: {
        importedInvoice: {
          include: {
            documentLinks: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        factoringOffer: true,
        capitalSource: true,
        events: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    await tx.factoringEventLog.create({
      data: {
        userId: input.userId,
        importedInvoiceId: invoice.id,
        factoringTransactionId: transaction.id,
        eventType: FactoringEventType.TERMS_ACCEPTED,
        message: `Terms accepted for ${settlementMethod.label.toLowerCase()} settlement.`,
        metadata: {
          settlementMethod: input.settlementMethod,
          settlementDestinationMasked: settlement.settlementDestinationMasked,
          discountRateBps: calculated.discountRateBps,
        },
      },
    });

    await tx.factoringEventLog.create({
      data: {
        userId: input.userId,
        importedInvoiceId: invoice.id,
        factoringTransactionId: transaction.id,
        eventType: FactoringEventType.TRANSACTION_CREATED,
        statusTo: FactoringTransactionStatus.PENDING,
        message: "Factoring transaction created and queued for settlement.",
        metadata: {
          transactionReference,
          netProceeds: calculated.netProceeds,
          settlementCurrency: calculated.settlementCurrency,
        },
      },
    });

    await tx.factoringEventLog.create({
      data: {
        userId: input.userId,
        importedInvoiceId: invoice.id,
        factoringTransactionId: transaction.id,
        eventType: FactoringEventType.ARENA_SETTLEMENT_PREPARED,
        statusTo: FactoringTransactionStatus.PENDING,
        message: preparedSettlement.message,
        metadata: {
          capitalSourceKey: preparedSettlement.capitalSourceKey,
          settlementReference: preparedSettlement.settlementReference,
          network: preparedSettlement.network,
          onChainExecutionStatus: preparedSettlement.onChainExecutionStatus,
        },
      },
    });

    return {
      created: true,
      transaction: await tx.factoringTransaction.findUniqueOrThrow({
        where: {
          id: transaction.id,
        },
        include: {
          importedInvoice: {
            include: {
              documentLinks: {
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          },
          factoringOffer: true,
          capitalSource: true,
          events: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),
    };
  });

  logger.info("factoring.transaction_created", {
    created: result.created,
    transactionId: result.transaction.id,
    importedInvoiceId: invoice.id,
    settlementMethod: input.settlementMethod,
  });

  return result;
}

export async function createFactoringTransactionForUser(
  input: CreateFactoringTransactionInput,
) {
  return createFactoringTransaction(createTransactionDeps, input);
}

export async function transitionFactoringTransactionForUser(
  input: TransitionFactoringTransactionInput,
) {
  const transaction = await getFactoringTransactionForUser({
    userId: input.userId,
    transactionId: input.transactionId,
  });

  if (!transaction) {
    throw new AppError(
      "Factoring transaction not found.",
      404,
      "FACTORING_TRANSACTION_NOT_FOUND",
    );
  }

  if (
    input.targetStatus === FactoringTransactionStatus.FUNDED &&
    transaction.status !== FactoringTransactionStatus.PENDING
  ) {
    throw new AppError(
      "Only pending transactions can be marked as funded.",
      409,
      "INVALID_TRANSACTION_TRANSITION",
    );
  }

  if (
    input.targetStatus === FactoringTransactionStatus.REPAID &&
    transaction.status !== FactoringTransactionStatus.FUNDED
  ) {
    throw new AppError(
      "Only funded transactions can be marked as repaid.",
      409,
      "INVALID_TRANSACTION_TRANSITION",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextOnChainStatus =
      input.targetStatus === FactoringTransactionStatus.FUNDED
        ? OnChainExecutionStatus.SETTLED
        : transaction.onChainExecutionStatus;

    await tx.factoringTransaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: input.targetStatus,
        fundedAt:
          input.targetStatus === FactoringTransactionStatus.FUNDED
            ? new Date()
            : undefined,
        repaidAt:
          input.targetStatus === FactoringTransactionStatus.REPAID
            ? new Date()
            : undefined,
        onChainExecutionStatus: nextOnChainStatus,
      },
      include: {
        importedInvoice: {
          include: {
            documentLinks: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        factoringOffer: true,
        capitalSource: true,
        events: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    await tx.factoringEventLog.create({
      data: {
        userId: input.userId,
        importedInvoiceId: transaction.importedInvoiceId,
        factoringTransactionId: transaction.id,
        eventType:
          input.targetStatus === FactoringTransactionStatus.REPAID
            ? FactoringEventType.REPAYMENT_RECORDED
            : FactoringEventType.STATUS_CHANGED,
        statusFrom: transaction.status,
        statusTo: input.targetStatus,
        message:
          input.targetStatus === FactoringTransactionStatus.FUNDED
            ? "Capital disbursement confirmed by the managed pool."
            : "Repayment recorded and the factoring cycle is complete.",
        metadata: {
          onChainExecutionStatus: nextOnChainStatus,
          arenaSettlementReference: transaction.arenaSettlementReference,
        },
      },
    });

    return tx.factoringTransaction.findUniqueOrThrow({
      where: {
        id: transaction.id,
      },
      include: {
        importedInvoice: {
          include: {
            documentLinks: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        factoringOffer: true,
        capitalSource: true,
        events: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  });

  logger.info("factoring.transaction_transitioned", {
    transactionId: updated.id,
    from: transaction.status,
    to: input.targetStatus,
  });

  return updated;
}
