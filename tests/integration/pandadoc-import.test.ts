import { IntegrationStatus, Provider } from "@prisma/client";

vi.mock("@/lib/env", () => ({
  env: {
    PANDADOC_TEMPLATE_UUID: "template_123",
    PANDADOC_RECIPIENT_ROLE: "Client",
    PANDADOC_DOCUMENT_NAME_PREFIX: "Invoice",
    PANDADOC_SEND_ON_IMPORT: false,
  },
  hasPandaDocImportConfig: () => true,
}));

import { importInvoiceToPandaDoc } from "@/lib/pandadoc/import-invoice";
import type { DocumentLinkWithRelations } from "@/lib/db/document-links";
import type { getImportedInvoiceForUser } from "@/lib/db/invoices";

type ImportedInvoiceWithLinks = NonNullable<
  Awaited<ReturnType<typeof getImportedInvoiceForUser>>
>;

function buildInvoice(
  overrides: Partial<ImportedInvoiceWithLinks> = {},
): ImportedInvoiceWithLinks {
  return {
    id: "invoice_1",
    userId: "user_1",
    connectionId: "qb_connection_1",
    quickBooksCompanyId: "company_1",
    provider: Provider.QUICKBOOKS,
    providerInvoiceId: "9001",
    docNumber: "INV-9001",
    totalAmount: "1250.00" as never,
    balanceAmount: "1250.00" as never,
    currency: "USD",
    dueDate: new Date("2026-03-20T00:00:00.000Z"),
    issueDate: new Date("2026-03-01T00:00:00.000Z"),
    txnDate: new Date("2026-03-01T00:00:00.000Z"),
    createdTime: new Date("2026-03-01T10:00:00.000Z"),
    updatedTime: new Date("2026-03-01T11:00:00.000Z"),
    counterpartyName: "Acme Holdings",
    counterpartyEmail: "billing@acme.example",
    normalizedStatus: "OPEN",
    rawPayload: {},
    lastSyncedAt: new Date("2026-03-06T12:00:00.000Z"),
    createdAt: new Date("2026-03-06T12:00:00.000Z"),
    updatedAt: new Date("2026-03-06T12:00:00.000Z"),
    documentLinks: [],
    ...overrides,
  } as ImportedInvoiceWithLinks;
}

function buildLink(
  overrides: Partial<DocumentLinkWithRelations> = {},
): DocumentLinkWithRelations {
  const invoice = buildInvoice();

  return {
    id: "link_1",
    userId: "user_1",
    importedInvoiceId: invoice.id,
    pandadocConnectionId: "pd_connection_1",
    pandadocDocumentId: "pending:abc",
    documentName: "Invoice INV-9001 - Acme Holdings",
    pandadocDocumentStatus: "document.importing",
    autoSend: false,
    sentAt: null,
    lastSyncedAt: new Date("2026-03-06T12:00:00.000Z"),
    lastError: null,
    syncDirection: "BIDIRECTIONAL",
    metadata: {},
    createdAt: new Date("2026-03-06T12:00:00.000Z"),
    updatedAt: new Date("2026-03-06T12:00:00.000Z"),
    importedInvoice: invoice,
    pandadocConnection: {
      id: "pd_connection_1",
      userId: "user_1",
      provider: Provider.PANDADOC,
      status: IntegrationStatus.CONNECTED,
      displayName: "Morgan Panda",
      externalAccountId: "pd_user_demo",
      externalAccountName: "PandaDoc Demo Workspace",
      scopes: [],
      lastSyncAt: null,
      lastError: null,
      metadata: {},
      createdAt: new Date("2026-03-06T12:00:00.000Z"),
      updatedAt: new Date("2026-03-06T12:00:00.000Z"),
    },
    ...overrides,
  } as DocumentLinkWithRelations;
}

describe("importInvoiceToPandaDoc", () => {
  it("creates a PandaDoc document from an imported QuickBooks invoice", async () => {
    const invoice = buildInvoice();
    const claimedLink = buildLink();
    const finalizedLink = buildLink({
      pandadocDocumentId: "doc_123",
      pandadocDocumentStatus: "document.uploaded",
    });

    const deps = {
      getInvoice: vi.fn().mockResolvedValue(invoice),
      getPandaDocConnection: vi.fn().mockResolvedValue({
        id: "pd_connection_1",
        status: IntegrationStatus.CONNECTED,
      }),
      getAccessToken: vi.fn().mockResolvedValue("pd_access"),
      claimSlot: vi.fn().mockResolvedValue({
        mode: "claimed",
        link: claimedLink,
      }),
      createDocument: vi.fn().mockResolvedValue({
        id: "doc_123",
        name: "Invoice INV-9001 - Acme Holdings",
        status: "document.uploaded",
      }),
      fetchDocumentDetails: vi.fn().mockResolvedValue({
        id: "doc_123",
        name: "Invoice INV-9001 - Acme Holdings",
        status: "document.uploaded",
      }),
      finalizeImport: vi.fn().mockResolvedValue(finalizedLink),
      updateLinkState: vi.fn().mockResolvedValue(finalizedLink),
      markImportError: vi.fn().mockResolvedValue(undefined),
      sendDocument: vi.fn().mockResolvedValue({ ok: true }),
    };

    const result = await importInvoiceToPandaDoc(deps, {
      userId: "user_1",
      importedInvoiceId: invoice.id,
    });

    expect(deps.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "pd_access",
        templateUuid: "template_123",
        recipients: [
          expect.objectContaining({
            email: "billing@acme.example",
            role: "Client",
          }),
        ],
        tokens: expect.arrayContaining([
          expect.objectContaining({ name: "Invoice.ID", value: "9001" }),
          expect.objectContaining({
            name: "Customer.Email",
            value: "billing@acme.example",
          }),
        ]),
      }),
    );
    expect(result.created).toBe(true);
    expect(result.sendRequested).toBe(false);
    expect(result.link.pandadocDocumentId).toBe("doc_123");
  });

  it("returns the existing PandaDoc link instead of creating duplicates", async () => {
    const existingLink = buildLink({
      pandadocDocumentId: "doc_existing",
      pandadocDocumentStatus: "document.sent",
    });
    const refreshedLink = buildLink({
      pandadocDocumentId: "doc_existing",
      pandadocDocumentStatus: "document.sent",
    });

    const deps = {
      getInvoice: vi.fn().mockResolvedValue(buildInvoice()),
      getPandaDocConnection: vi.fn().mockResolvedValue({
        id: "pd_connection_1",
        status: IntegrationStatus.CONNECTED,
      }),
      getAccessToken: vi.fn().mockResolvedValue("pd_access"),
      claimSlot: vi.fn().mockResolvedValue({
        mode: "existing",
        link: existingLink,
      }),
      createDocument: vi.fn(),
      fetchDocumentDetails: vi.fn().mockResolvedValue({
        id: "doc_existing",
        name: "Invoice INV-9001 - Acme Holdings",
        status: "document.sent",
      }),
      finalizeImport: vi.fn(),
      updateLinkState: vi.fn().mockResolvedValue(refreshedLink),
      markImportError: vi.fn(),
      sendDocument: vi.fn(),
    };

    const result = await importInvoiceToPandaDoc(deps, {
      userId: "user_1",
      importedInvoiceId: "invoice_1",
    });

    expect(deps.createDocument).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
    expect(result.link.pandadocDocumentId).toBe("doc_existing");
  });

  it("rejects invoices without a payer email", async () => {
    const deps = {
      getInvoice: vi.fn().mockResolvedValue(
        buildInvoice({
          counterpartyEmail: null,
        }),
      ),
      getPandaDocConnection: vi.fn(),
      getAccessToken: vi.fn(),
      claimSlot: vi.fn(),
      createDocument: vi.fn(),
      fetchDocumentDetails: vi.fn(),
      finalizeImport: vi.fn(),
      updateLinkState: vi.fn(),
      markImportError: vi.fn(),
      sendDocument: vi.fn(),
    };

    await expect(
      importInvoiceToPandaDoc(deps, {
        userId: "user_1",
        importedInvoiceId: "invoice_1",
      }),
    ).rejects.toThrow("does not include a payer email");
  });
});
