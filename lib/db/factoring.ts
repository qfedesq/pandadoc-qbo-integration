import {
  CapitalSourceType,
  Prisma,
  type FactoringEligibilityStatus,
  type FactoringTransactionStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { buildImportedInvoiceWhereInput } from "@/lib/db/invoices";
import { env } from "@/lib/env";
import { DEFAULT_CAPITAL_SOURCE_KEY, DEFAULT_MARKETPLACE_NODE } from "@/lib/factoring/marketplace";

const documentLinksInclude = {
  orderBy: {
    createdAt: "desc",
  },
} satisfies Prisma.DocumentInvoiceLinkFindManyArgs;

const factoringInvoiceInclude = {
  documentLinks: documentLinksInclude,
  factoringOffer: true,
  factoringTransactions: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      capitalSource: true,
    },
  },
} satisfies Prisma.ImportedInvoiceInclude;

export type FactoringInvoiceWithRelations = Prisma.ImportedInvoiceGetPayload<{
  include: typeof factoringInvoiceInclude;
}>;

const factoringTransactionInclude = {
  importedInvoice: {
    include: {
      documentLinks: documentLinksInclude,
    },
  },
  factoringOffer: true,
  capitalSource: true,
  events: {
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.FactoringTransactionInclude;

export type FactoringTransactionWithRelations = Prisma.FactoringTransactionGetPayload<{
  include: typeof factoringTransactionInclude;
}>;

function buildCapitalSourceMetadata() {
  return {
    operator: "Protofire Venture Studio",
    executionMode: "arena-stafi-simulated",
    liquiditySharedAcrossNodes: true,
    note: "Tier 1 MVP managed liquidity source for PandaDoc.",
  };
}

export async function getOrCreateManagedCapitalSource() {
  return prisma.capitalSource.upsert({
    where: {
      key: DEFAULT_CAPITAL_SOURCE_KEY,
    },
    update: {
      name: env.ARENA_STAFI_POOL_NAME,
      marketplaceNode: DEFAULT_MARKETPLACE_NODE,
      type: CapitalSourceType.ARENA_STAFI_MANAGED_POOL,
      network: env.ARENA_STAFI_NETWORK,
      currency: "USDC",
      operatorWallet: env.ARENA_STAFI_OPERATOR_WALLET,
      liquiditySnapshot: env.ARENA_STAFI_LIQUIDITY_SNAPSHOT.toFixed(2),
      isActive: true,
      metadata: buildCapitalSourceMetadata(),
    },
    create: {
      key: DEFAULT_CAPITAL_SOURCE_KEY,
      name: env.ARENA_STAFI_POOL_NAME,
      marketplaceNode: DEFAULT_MARKETPLACE_NODE,
      type: CapitalSourceType.ARENA_STAFI_MANAGED_POOL,
      network: env.ARENA_STAFI_NETWORK,
      currency: "USDC",
      operatorWallet: env.ARENA_STAFI_OPERATOR_WALLET,
      liquiditySnapshot: env.ARENA_STAFI_LIQUIDITY_SNAPSHOT.toFixed(2),
      metadata: buildCapitalSourceMetadata(),
    },
  });
}

export async function listFactoringInvoicesForUser(input: {
  userId: string;
  search?: string;
  status?: import("@prisma/client").InvoiceStatus | "ALL";
  overdueOnly?: boolean;
}) {
  return prisma.importedInvoice.findMany({
    where: buildImportedInvoiceWhereInput(input),
    include: factoringInvoiceInclude,
    orderBy: [{ dueDate: "asc" }, { lastSyncedAt: "desc" }],
  });
}

export async function getFactoringInvoiceForUser(input: {
  userId: string;
  importedInvoiceId: string;
}) {
  return prisma.importedInvoice.findFirst({
    where: {
      id: input.importedInvoiceId,
      userId: input.userId,
    },
    include: factoringInvoiceInclude,
  });
}

export async function listRecentFactoringTransactionsForUser(
  userId: string,
  take = 5,
) {
  return prisma.factoringTransaction.findMany({
    where: {
      userId,
    },
    include: factoringTransactionInclude,
    orderBy: {
      createdAt: "desc",
    },
    take,
  });
}

export async function getFactoringTransactionForUser(input: {
  userId: string;
  transactionId: string;
}) {
  return prisma.factoringTransaction.findFirst({
    where: {
      id: input.transactionId,
      userId: input.userId,
    },
    include: factoringTransactionInclude,
  });
}

export async function upsertFactoringOffer(input: {
  userId: string;
  importedInvoiceId: string;
  capitalSourceId: string;
  marketplaceNode: import("@prisma/client").MarketplaceNode;
  accountingSystem: import("@prisma/client").AccountingSystem;
  eligibilityStatus: FactoringEligibilityStatus;
  ineligibilityReason?: string | null;
  grossAmount: Prisma.Decimal | string | number;
  discountRateBps: number;
  discountAmount: Prisma.Decimal | string | number;
  netProceeds: Prisma.Decimal | string | number;
  settlementCurrency: string;
  settlementTimeSummary: string;
  termsSnapshot: Prisma.InputJsonObject;
  generatedAt: Date;
}) {
  return prisma.factoringOffer.upsert({
    where: {
      importedInvoiceId: input.importedInvoiceId,
    },
    update: {
      capitalSourceId: input.capitalSourceId,
      marketplaceNode: input.marketplaceNode,
      accountingSystem: input.accountingSystem,
      eligibilityStatus: input.eligibilityStatus,
      ineligibilityReason: input.ineligibilityReason,
      grossAmount: input.grossAmount,
      discountRateBps: input.discountRateBps,
      discountAmount: input.discountAmount,
      netProceeds: input.netProceeds,
      settlementCurrency: input.settlementCurrency,
      settlementTimeSummary: input.settlementTimeSummary,
      termsSnapshot: input.termsSnapshot,
      generatedAt: input.generatedAt,
    },
    create: {
      userId: input.userId,
      importedInvoiceId: input.importedInvoiceId,
      capitalSourceId: input.capitalSourceId,
      marketplaceNode: input.marketplaceNode,
      accountingSystem: input.accountingSystem,
      eligibilityStatus: input.eligibilityStatus,
      ineligibilityReason: input.ineligibilityReason,
      grossAmount: input.grossAmount,
      discountRateBps: input.discountRateBps,
      discountAmount: input.discountAmount,
      netProceeds: input.netProceeds,
      settlementCurrency: input.settlementCurrency,
      settlementTimeSummary: input.settlementTimeSummary,
      termsSnapshot: input.termsSnapshot,
      generatedAt: input.generatedAt,
    },
  });
}

export async function findActiveFactoringTransactionForInvoice(input: {
  userId: string;
  importedInvoiceId: string;
}) {
  return prisma.factoringTransaction.findFirst({
    where: {
      userId: input.userId,
      importedInvoiceId: input.importedInvoiceId,
      status: {
        in: ["PENDING", "FUNDED"] satisfies FactoringTransactionStatus[],
      },
    },
    include: factoringTransactionInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function countFactoringTransactionsByStatus(input: {
  userId: string;
  statuses: FactoringTransactionStatus[];
}) {
  return prisma.factoringTransaction.count({
    where: {
      userId: input.userId,
      status: {
        in: input.statuses,
      },
    },
  });
}

export async function listFactoringOffersForUser(userId: string) {
  return prisma.factoringOffer.findMany({
    where: {
      userId,
    },
  });
}

export { factoringInvoiceInclude, factoringTransactionInclude };
