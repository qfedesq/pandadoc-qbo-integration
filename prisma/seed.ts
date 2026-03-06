import {
  AccountingSystem,
  CapitalSourceType,
  FactoringEligibilityStatus,
  FactoringEventType,
  FactoringTransactionStatus,
  InvoiceStatus,
  MarketplaceNode,
  OnChainExecutionStatus,
  Provider,
  SettlementMethod,
  PrismaClient,
} from "@prisma/client";

import { hashPassword } from "../lib/auth/passwords";
import { env } from "../lib/env";
import { encryptSecret } from "../lib/security/encryption";

const prisma = new PrismaClient();

async function seedAdminUser() {
  const passwordHash = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);

  return prisma.user.upsert({
    where: {
      email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
    },
    update: {
      passwordHash,
      name: "Admin User",
    },
    create: {
      email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
      name: "Admin User",
      passwordHash,
    },
  });
}

async function seedDemoData(userId: string) {
  const pandaDocConnection = await prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: Provider.PANDADOC,
      },
    },
    update: {
      status: "CONNECTED",
      displayName: "Morgan Panda",
      externalAccountId: "pd_user_demo",
      externalAccountName: "PandaDoc Demo Workspace",
      scopes: ["read", "write"],
      metadata: {
        email: "morgan@example.com",
        workspaceId: "workspace_demo",
        workspaceName: "PandaDoc Demo Workspace",
      },
    },
    create: {
      userId,
      provider: Provider.PANDADOC,
      status: "CONNECTED",
      displayName: "Morgan Panda",
      externalAccountId: "pd_user_demo",
      externalAccountName: "PandaDoc Demo Workspace",
      scopes: ["read", "write"],
      metadata: {
        email: "morgan@example.com",
        workspaceId: "workspace_demo",
        workspaceName: "PandaDoc Demo Workspace",
      },
    },
  });

  await prisma.oAuthToken.upsert({
    where: {
      connectionId: pandaDocConnection.id,
    },
    update: {
      accessTokenEncrypted: encryptSecret("pandadoc-demo-access-token"),
      refreshTokenEncrypted: encryptSecret("pandadoc-demo-refresh-token"),
      accessTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      refreshTokenExpiresAt: new Date("2030-06-01T00:00:00.000Z"),
      tokenType: "Bearer",
      scope: "read write",
    },
    create: {
      connectionId: pandaDocConnection.id,
      accessTokenEncrypted: encryptSecret("pandadoc-demo-access-token"),
      refreshTokenEncrypted: encryptSecret("pandadoc-demo-refresh-token"),
      accessTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      refreshTokenExpiresAt: new Date("2030-06-01T00:00:00.000Z"),
      tokenType: "Bearer",
      scope: "read write",
    },
  });

  const quickBooksConnection = await prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId,
        provider: Provider.QUICKBOOKS,
      },
    },
    update: {
      status: "CONNECTED",
      displayName: "Demo Manufacturing LLC",
      externalAccountId: "9130357992222222",
      externalAccountName: "Demo Manufacturing LLC",
      scopes: ["com.intuit.quickbooks.accounting"],
      lastSyncAt: new Date("2026-03-01T12:00:00.000Z"),
      metadata: {
        realmId: "9130357992222222",
      },
    },
    create: {
      userId,
      provider: Provider.QUICKBOOKS,
      status: "CONNECTED",
      displayName: "Demo Manufacturing LLC",
      externalAccountId: "9130357992222222",
      externalAccountName: "Demo Manufacturing LLC",
      scopes: ["com.intuit.quickbooks.accounting"],
      lastSyncAt: new Date("2026-03-01T12:00:00.000Z"),
      metadata: {
        realmId: "9130357992222222",
      },
    },
  });

  await prisma.oAuthToken.upsert({
    where: {
      connectionId: quickBooksConnection.id,
    },
    update: {
      accessTokenEncrypted: encryptSecret("quickbooks-demo-access-token"),
      refreshTokenEncrypted: encryptSecret("quickbooks-demo-refresh-token"),
      accessTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      refreshTokenExpiresAt: new Date("2030-06-01T00:00:00.000Z"),
      tokenType: "Bearer",
      scope: "com.intuit.quickbooks.accounting",
    },
    create: {
      connectionId: quickBooksConnection.id,
      accessTokenEncrypted: encryptSecret("quickbooks-demo-access-token"),
      refreshTokenEncrypted: encryptSecret("quickbooks-demo-refresh-token"),
      accessTokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
      refreshTokenExpiresAt: new Date("2030-06-01T00:00:00.000Z"),
      tokenType: "Bearer",
      scope: "com.intuit.quickbooks.accounting",
    },
  });

  const existingCompany = await prisma.quickBooksCompany.findFirst({
    where: {
      OR: [
        {
          connectionId: quickBooksConnection.id,
        },
        {
          realmId: "9130357992222222",
        },
      ],
    },
  });

  const company = existingCompany
    ? await prisma.quickBooksCompany.update({
        where: {
          id: existingCompany.id,
        },
        data: {
          connectionId: quickBooksConnection.id,
          realmId: "9130357992222222",
          companyName: "Demo Manufacturing LLC",
          country: "US",
          currency: "USD",
          metadata: {
            source: "seed",
          },
        },
      })
    : await prisma.quickBooksCompany.create({
        data: {
          connectionId: quickBooksConnection.id,
          realmId: "9130357992222222",
          companyName: "Demo Manufacturing LLC",
          country: "US",
          currency: "USD",
          metadata: {
            source: "seed",
          },
        },
      });

  const invoices = [
    {
      providerInvoiceId: "9001",
      docNumber: "INV-9001",
      totalAmount: "1250.00",
      balanceAmount: "1250.00",
      dueDate: new Date("2026-03-20T00:00:00.000Z"),
      issueDate: new Date("2026-03-01T00:00:00.000Z"),
      counterpartyName: "Acme Holdings",
      counterpartyEmail: "billing@acme.example",
      normalizedStatus: InvoiceStatus.OPEN,
      lastSyncedAt: new Date("2026-03-01T12:00:00.000Z"),
    },
    {
      providerInvoiceId: "9002",
      docNumber: "INV-9002",
      totalAmount: "980.00",
      balanceAmount: "980.00",
      dueDate: new Date("2026-02-20T00:00:00.000Z"),
      issueDate: new Date("2026-02-01T00:00:00.000Z"),
      counterpartyName: "Northwind Traders",
      counterpartyEmail: "ap@northwind.example",
      normalizedStatus: InvoiceStatus.OVERDUE,
      lastSyncedAt: new Date("2026-03-01T12:00:00.000Z"),
    },
    {
      providerInvoiceId: "9003",
      docNumber: "INV-9003",
      totalAmount: "2400.00",
      balanceAmount: "600.00",
      dueDate: new Date("2026-03-15T00:00:00.000Z"),
      issueDate: new Date("2026-02-27T00:00:00.000Z"),
      counterpartyName: "Globex Corporation",
      counterpartyEmail: "finance@globex.example",
      normalizedStatus: InvoiceStatus.PARTIALLY_PAID,
      lastSyncedAt: new Date("2026-03-01T12:00:00.000Z"),
    },
  ];

  for (const invoice of invoices) {
    await prisma.importedInvoice.upsert({
      where: {
        connectionId_providerInvoiceId: {
          connectionId: quickBooksConnection.id,
          providerInvoiceId: invoice.providerInvoiceId,
        },
      },
      update: {
        quickBooksCompanyId: company.id,
        provider: Provider.QUICKBOOKS,
        ...invoice,
        currency: "USD",
        rawPayload: {
          seeded: true,
          id: invoice.providerInvoiceId,
        },
      },
      create: {
        userId,
        connectionId: quickBooksConnection.id,
        quickBooksCompanyId: company.id,
        provider: Provider.QUICKBOOKS,
        ...invoice,
        currency: "USD",
        rawPayload: {
          seeded: true,
          id: invoice.providerInvoiceId,
        },
      },
    });
  }

  const seededInvoice = await prisma.importedInvoice.findUniqueOrThrow({
    where: {
      connectionId_providerInvoiceId: {
        connectionId: quickBooksConnection.id,
        providerInvoiceId: "9003",
      },
    },
  });

  const capitalSource = await prisma.capitalSource.upsert({
    where: {
      key: "arena-stafi-managed-pool",
    },
    update: {
      name: "Protofire Arena StaFi Managed Pool",
      marketplaceNode: MarketplaceNode.PANDADOC,
      type: CapitalSourceType.ARENA_STAFI_MANAGED_POOL,
      network: "Arena StaFi",
      currency: "USDC",
      operatorWallet: "0xProtofireOperatorWalletDemo",
      liquiditySnapshot: "500000.00",
      metadata: {
        seeded: true,
      },
    },
    create: {
      key: "arena-stafi-managed-pool",
      name: "Protofire Arena StaFi Managed Pool",
      marketplaceNode: MarketplaceNode.PANDADOC,
      type: CapitalSourceType.ARENA_STAFI_MANAGED_POOL,
      network: "Arena StaFi",
      currency: "USDC",
      operatorWallet: "0xProtofireOperatorWalletDemo",
      liquiditySnapshot: "500000.00",
      metadata: {
        seeded: true,
      },
    },
  });

  const factoringOffer = await prisma.factoringOffer.upsert({
    where: {
      importedInvoiceId: seededInvoice.id,
    },
    update: {
      capitalSourceId: capitalSource.id,
      marketplaceNode: MarketplaceNode.PANDADOC,
      accountingSystem: AccountingSystem.QUICKBOOKS,
      eligibilityStatus: FactoringEligibilityStatus.INELIGIBLE,
      ineligibilityReason:
        "An active factoring transaction already exists for this invoice.",
      grossAmount: "600.00",
      discountRateBps: 325,
      discountAmount: "19.50",
      netProceeds: "580.50",
      settlementCurrency: "USDC",
      settlementTimeSummary:
        "USDC wallet: Within minutes / ACH: Same business day / Debit card: Within 30 minutes",
      termsSnapshot: {
        seeded: true,
        invoiceId: seededInvoice.providerInvoiceId,
      },
      generatedAt: new Date("2026-03-01T12:00:00.000Z"),
    },
    create: {
      userId,
      importedInvoiceId: seededInvoice.id,
      capitalSourceId: capitalSource.id,
      marketplaceNode: MarketplaceNode.PANDADOC,
      accountingSystem: AccountingSystem.QUICKBOOKS,
      eligibilityStatus: FactoringEligibilityStatus.INELIGIBLE,
      ineligibilityReason:
        "An active factoring transaction already exists for this invoice.",
      grossAmount: "600.00",
      discountRateBps: 325,
      discountAmount: "19.50",
      netProceeds: "580.50",
      settlementCurrency: "USDC",
      settlementTimeSummary:
        "USDC wallet: Within minutes / ACH: Same business day / Debit card: Within 30 minutes",
      termsSnapshot: {
        seeded: true,
        invoiceId: seededInvoice.providerInvoiceId,
      },
      generatedAt: new Date("2026-03-01T12:00:00.000Z"),
    },
  });

  const seededTransaction = await prisma.factoringTransaction.upsert({
    where: {
      transactionReference: "FACT-DEMO-9003",
    },
    update: {
      userId,
      importedInvoiceId: seededInvoice.id,
      factoringOfferId: factoringOffer.id,
      capitalSourceId: capitalSource.id,
      marketplaceNode: MarketplaceNode.PANDADOC,
      accountingSystem: AccountingSystem.QUICKBOOKS,
      status: FactoringTransactionStatus.FUNDED,
      settlementMethod: SettlementMethod.USDC_WALLET,
      settlementDestinationMasked: "Wallet 0x1234...cafe",
      sellerWalletAddress: "0x1234567890abcdefcafe",
      invoiceCurrency: "USD",
      settlementCurrency: "USDC",
      grossAmount: "600.00",
      discountRateBps: 325,
      discountAmount: "19.50",
      netProceeds: "580.50",
      settlementTimeLabel: "Within minutes",
      termsAcceptedAt: new Date("2026-03-01T12:15:00.000Z"),
      fundedAt: new Date("2026-03-01T12:20:00.000Z"),
      repaidAt: null,
      operatorWallet: "0xProtofireOperatorWalletDemo",
      arenaSettlementReference: "arena_sim_seeded_9003",
      onChainExecutionStatus: OnChainExecutionStatus.SETTLED,
      metadata: {
        seeded: true,
      },
    },
    create: {
      transactionReference: "FACT-DEMO-9003",
      userId,
      importedInvoiceId: seededInvoice.id,
      factoringOfferId: factoringOffer.id,
      capitalSourceId: capitalSource.id,
      marketplaceNode: MarketplaceNode.PANDADOC,
      accountingSystem: AccountingSystem.QUICKBOOKS,
      status: FactoringTransactionStatus.FUNDED,
      settlementMethod: SettlementMethod.USDC_WALLET,
      settlementDestinationMasked: "Wallet 0x1234...cafe",
      sellerWalletAddress: "0x1234567890abcdefcafe",
      invoiceCurrency: "USD",
      settlementCurrency: "USDC",
      grossAmount: "600.00",
      discountRateBps: 325,
      discountAmount: "19.50",
      netProceeds: "580.50",
      settlementTimeLabel: "Within minutes",
      termsAcceptedAt: new Date("2026-03-01T12:15:00.000Z"),
      fundedAt: new Date("2026-03-01T12:20:00.000Z"),
      operatorWallet: "0xProtofireOperatorWalletDemo",
      arenaSettlementReference: "arena_sim_seeded_9003",
      onChainExecutionStatus: OnChainExecutionStatus.SETTLED,
      metadata: {
        seeded: true,
      },
    },
  });

  await prisma.factoringEventLog.deleteMany({
    where: {
      factoringTransactionId: seededTransaction.id,
    },
  });

  await prisma.factoringEventLog.createMany({
    data: [
      {
        userId,
        importedInvoiceId: seededInvoice.id,
        factoringTransactionId: seededTransaction.id,
        eventType: FactoringEventType.OFFER_GENERATED,
        message: "Seeded terms generated for the partial-payment invoice.",
        metadata: {
          seeded: true,
        },
      },
      {
        userId,
        importedInvoiceId: seededInvoice.id,
        factoringTransactionId: seededTransaction.id,
        eventType: FactoringEventType.TRANSACTION_CREATED,
        statusTo: FactoringTransactionStatus.PENDING,
        message: "Seeded factoring transaction created.",
        metadata: {
          seeded: true,
        },
      },
      {
        userId,
        importedInvoiceId: seededInvoice.id,
        factoringTransactionId: seededTransaction.id,
        eventType: FactoringEventType.STATUS_CHANGED,
        statusFrom: FactoringTransactionStatus.PENDING,
        statusTo: FactoringTransactionStatus.FUNDED,
        message: "Seeded transaction advanced to funded.",
        metadata: {
          seeded: true,
        },
      },
    ],
  });
}

async function main() {
  const user = await seedAdminUser();

  if (env.SEED_DEMO_DATA) {
    await seedDemoData(user.id);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
