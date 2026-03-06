import type {
  PandaDocCreateDocumentResponse,
  PandaDocCurrentMember,
  PandaDocDocumentDetails,
  PandaDocDocumentRecipient,
  PandaDocDocumentToken,
} from "@/lib/providers/pandadoc/schemas";

export function getMockPandaDocMember(): PandaDocCurrentMember {
  return {
    id: "pd_member_mock_1",
    user_id: "pd_user_demo",
    membership_id: "pd_membership_demo",
    email: "morgan@example.com",
    first_name: "Morgan",
    last_name: "Panda",
    workspace_id: "workspace_demo",
    workspace_name: "PandaDoc Demo Workspace",
  };
}

export function createMockPandaDocDocument(input: {
  name: string;
  recipients: PandaDocDocumentRecipient[];
  tokens: PandaDocDocumentToken[];
  metadata?: Record<string, string>;
}): PandaDocCreateDocumentResponse {
  const invoiceReference =
    input.metadata?.providerInvoiceId ??
    input.tokens.find((token) => token.name === "Invoice.ID")?.value ??
    "demo";

  return {
    id: `mock-pd-doc-${invoiceReference.toLowerCase()}`,
    name: input.name,
    status: "document.draft",
  };
}

export function getMockPandaDocDocumentDetails(input: {
  documentId: string;
  metadata?: Record<string, string> | null;
}): PandaDocDocumentDetails {
  return {
    id: input.documentId,
    name:
      input.metadata?.providerInvoiceId != null
        ? `Invoice ${input.metadata.providerInvoiceId}`
        : input.documentId,
    status: "document.draft",
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    metadata: input.metadata ?? undefined,
  };
}
