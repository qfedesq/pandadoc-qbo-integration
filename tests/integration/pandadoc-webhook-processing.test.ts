import { IntegrationStatus, Provider } from "@prisma/client";

import { processPandaDocWebhookEvents } from "@/lib/webhooks/pandadoc";

describe("processPandaDocWebhookEvents", () => {
  it("auto-sends a PandaDoc draft when the link is marked autoSend", async () => {
    const link = {
      id: "link_1",
      userId: "user_1",
      importedInvoiceId: "invoice_1",
      pandadocConnectionId: "pd_connection_1",
      pandadocDocumentId: "doc_123",
      documentName: "Invoice INV-9001 - Acme Holdings",
      pandadocDocumentStatus: "document.uploaded",
      autoSend: true,
      sentAt: null,
      lastSyncedAt: null,
      lastError: null,
      syncDirection: "BIDIRECTIONAL",
      metadata: {},
      createdAt: new Date("2026-03-06T12:00:00.000Z"),
      updatedAt: new Date("2026-03-06T12:00:00.000Z"),
      importedInvoice: {
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
      },
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
    } as const;

    const deps = {
      findLinkByDocumentId: vi.fn().mockResolvedValue(link),
      updateLinkState: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue("pd_access"),
      sendDocument: vi.fn().mockResolvedValue({ ok: true }),
      now: () => new Date("2026-03-06T12:30:00.000Z"),
    };

    await processPandaDocWebhookEvents(deps, [
      {
        event: "document_state_changed",
        data: {
          id: "doc_123",
          status: "document.draft",
          name: "Invoice INV-9001 - Acme Holdings",
        },
      },
    ]);

    expect(deps.sendDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "pd_access",
        documentId: "doc_123",
      }),
    );
    expect(deps.updateLinkState).toHaveBeenCalledWith(
      expect.objectContaining({
        linkId: "link_1",
        status: "document.sent",
        sentAt: new Date("2026-03-06T12:30:00.000Z"),
      }),
    );
  });

  it("records document creation failures on the link", async () => {
    const deps = {
      findLinkByDocumentId: vi.fn().mockResolvedValue({
        id: "link_1",
        autoSend: false,
        sentAt: null,
      }),
      updateLinkState: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn(),
      sendDocument: vi.fn(),
    };

    await processPandaDocWebhookEvents(deps, [
      {
        event: "document_creation_failed",
        data: {
          id: "doc_999",
          detail: "Template validation failed",
        },
      },
    ]);

    expect(deps.sendDocument).not.toHaveBeenCalled();
    expect(deps.updateLinkState).toHaveBeenCalledWith(
      expect.objectContaining({
        linkId: "link_1",
        status: "document.creation_failed",
        lastError: "Template validation failed",
      }),
    );
  });
});
