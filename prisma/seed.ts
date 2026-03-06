import { InvoiceStatus, Provider, PrismaClient } from "@prisma/client";

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

  const company = await prisma.quickBooksCompany.upsert({
    where: {
      connectionId: quickBooksConnection.id,
    },
    update: {
      realmId: "9130357992222222",
      companyName: "Demo Manufacturing LLC",
      country: "US",
      currency: "USD",
      metadata: {
        source: "seed",
      },
    },
    create: {
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
