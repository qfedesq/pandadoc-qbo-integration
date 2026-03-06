import { type DocumentInvoiceLink, IntegrationStatus, Provider } from "@prisma/client";

import {
  claimDocumentImportSlot,
  finalizeDocumentImport,
  markDocumentImportError,
  type DocumentLinkWithRelations,
  updateDocumentLinkState,
} from "@/lib/db/document-links";
import { findUserConnection } from "@/lib/db/integrations";
import { getImportedInvoiceForUser } from "@/lib/db/invoices";
import { env, hasPandaDocImportConfig } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import {
  createPandaDocDocumentFromTemplate,
  fetchPandaDocDocumentDetails,
  sendPandaDocDocument,
} from "@/lib/providers/pandadoc/client";
import { getPandaDocAccessToken } from "@/lib/providers/pandadoc/tokens";
import { AppError, getErrorMessage } from "@/lib/utils/errors";

type ImportedInvoiceWithLinks = NonNullable<
  Awaited<ReturnType<typeof getImportedInvoiceForUser>>
>;

type ImportInvoiceDeps = {
  now?: () => Date;
  getInvoice: typeof getImportedInvoiceForUser;
  getPandaDocConnection: typeof findUserConnection;
  getAccessToken: typeof getPandaDocAccessToken;
  claimSlot: typeof claimDocumentImportSlot;
  createDocument: typeof createPandaDocDocumentFromTemplate;
  fetchDocumentDetails: typeof fetchPandaDocDocumentDetails;
  finalizeImport: typeof finalizeDocumentImport;
  updateLinkState: typeof updateDocumentLinkState;
  markImportError: typeof markDocumentImportError;
  sendDocument: typeof sendPandaDocDocument;
};

export type PandaDocImportResult = {
  created: boolean;
  sendRequested: boolean;
  sendInitiated: boolean;
  link: DocumentInvoiceLink | DocumentLinkWithRelations;
};

function buildDocumentName(invoice: ImportedInvoiceWithLinks) {
  const reference = invoice.docNumber ?? invoice.providerInvoiceId;
  return `${env.PANDADOC_DOCUMENT_NAME_PREFIX} ${reference} - ${invoice.counterpartyName}`;
}

function splitCounterpartyName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: null,
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function buildDocumentTokens(invoice: ImportedInvoiceWithLinks) {
  return [
    { name: "Invoice.ID", value: invoice.providerInvoiceId },
    { name: "Invoice.Number", value: invoice.docNumber ?? invoice.providerInvoiceId },
    { name: "Invoice.Amount", value: invoice.totalAmount.toString() },
    { name: "Invoice.Balance", value: invoice.balanceAmount.toString() },
    { name: "Invoice.Currency", value: invoice.currency ?? "USD" },
    { name: "Invoice.DueDate", value: invoice.dueDate?.toISOString() ?? "" },
    { name: "Customer.Name", value: invoice.counterpartyName },
    { name: "Customer.Email", value: invoice.counterpartyEmail ?? "" },
  ];
}

function buildSendMessage(invoice: ImportedInvoiceWithLinks, documentName: string) {
  return {
    subject: `${documentName}`,
    message: `Please review and complete payment for invoice ${
      invoice.docNumber ?? invoice.providerInvoiceId
    }.`,
  };
}

async function refreshExistingDocumentLink(
  deps: ImportInvoiceDeps,
  input: {
    link: DocumentInvoiceLink;
    pandadocConnectionId: string;
  },
) {
  if (input.link.pandadocDocumentId.startsWith("pending:")) {
    return input.link;
  }

  try {
    const accessToken = await deps.getAccessToken(input.pandadocConnectionId);
    const document = await deps.fetchDocumentDetails(
      accessToken,
      input.link.pandadocDocumentId,
    );

    return deps.updateLinkState({
      linkId: input.link.id,
      status: document.status ?? input.link.pandadocDocumentStatus,
      documentName: document.name ?? input.link.documentName,
      metadata: document.metadata ?? undefined,
      lastError: null,
    });
  } catch (error) {
    logger.warn("pandadoc.import_existing_refresh_failed", {
      linkId: input.link.id,
      error,
    });
    return input.link;
  }
}

export async function importInvoiceToPandaDoc(
  deps: ImportInvoiceDeps,
  input: {
    userId: string;
    importedInvoiceId: string;
    sendImmediately?: boolean;
  },
): Promise<PandaDocImportResult> {
  if (!hasPandaDocImportConfig()) {
    throw new AppError(
      "PandaDoc document import is not configured.",
      500,
      "PANDADOC_IMPORT_CONFIG_ERROR",
    );
  }

  const invoice = await deps.getInvoice({
    userId: input.userId,
    importedInvoiceId: input.importedInvoiceId,
  });

  if (!invoice) {
    throw new AppError("Imported invoice not found.", 404, "INVOICE_NOT_FOUND");
  }

  if (!invoice.counterpartyEmail) {
    throw new AppError(
      "The selected invoice does not include a payer email in QuickBooks.",
      400,
      "INVOICE_PAYER_EMAIL_MISSING",
    );
  }

  const pandaDocConnection = await deps.getPandaDocConnection(
    input.userId,
    Provider.PANDADOC,
  );

  if (!pandaDocConnection || pandaDocConnection.status !== IntegrationStatus.CONNECTED) {
    throw new AppError(
      "Connect PandaDoc before importing invoices.",
      400,
      "PANDADOC_CONNECTION_REQUIRED",
    );
  }

  const sendImmediately = input.sendImmediately ?? env.PANDADOC_SEND_ON_IMPORT;
  const documentName = buildDocumentName(invoice);
  const claim = await deps.claimSlot({
    userId: input.userId,
    importedInvoiceId: invoice.id,
    pandadocConnectionId: pandaDocConnection.id,
    documentName,
    autoSend: sendImmediately,
  });

  if (claim.mode === "existing") {
    const refreshed = await refreshExistingDocumentLink(deps, {
      link: claim.link,
      pandadocConnectionId: pandaDocConnection.id,
    });

    return {
      created: false,
      sendRequested: refreshed.autoSend,
      sendInitiated: Boolean(refreshed.sentAt),
      link: refreshed,
    };
  }

  const accessToken = await deps.getAccessToken(pandaDocConnection.id);
  const { firstName, lastName } = splitCounterpartyName(invoice.counterpartyName);

  try {
    const created = await deps.createDocument({
      accessToken,
      name: documentName,
      templateUuid: env.PANDADOC_TEMPLATE_UUID,
      recipients: [
        {
          email: invoice.counterpartyEmail,
          first_name: firstName,
          last_name: lastName,
          role: env.PANDADOC_RECIPIENT_ROLE,
        },
      ],
      tokens: buildDocumentTokens(invoice),
      metadata: {
        importedInvoiceId: invoice.id,
        providerInvoiceId: invoice.providerInvoiceId,
        userId: input.userId,
      },
    });

    let link = await deps.finalizeImport({
      linkId: claim.link.id,
      pandadocDocumentId: created.id,
      documentName: created.name ?? documentName,
      status: created.status ?? "document.uploaded",
      metadata: {
        importedInvoiceId: invoice.id,
        providerInvoiceId: invoice.providerInvoiceId,
      },
    });

    let sendInitiated = false;

    if (sendImmediately) {
      const details = await deps
        .fetchDocumentDetails(accessToken, created.id)
        .catch(() => null);

      if (details?.status === "document.draft") {
        const sendMessage = buildSendMessage(invoice, documentName);
        await deps.sendDocument({
          accessToken,
          documentId: created.id,
          subject: sendMessage.subject,
          message: sendMessage.message,
        });
        sendInitiated = true;
        link = await deps.updateLinkState({
          linkId: link.id,
          status: "document.sent",
          sentAt: deps.now?.() ?? new Date(),
          lastError: null,
        });
      } else if (details?.status) {
        link = await deps.updateLinkState({
          linkId: link.id,
          status: details.status,
          documentName: details.name ?? link.documentName,
          metadata: details.metadata ?? undefined,
          lastError: null,
        });
      }
    }

    return {
      created: true,
      sendRequested: sendImmediately,
      sendInitiated,
      link,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await deps.markImportError(claim.link.id, message);
    throw new AppError(message, 502, "PANDADOC_IMPORT_FAILED");
  }
}

export async function importInvoiceToPandaDocForUser(input: {
  userId: string;
  importedInvoiceId: string;
  sendImmediately?: boolean;
}) {
  return importInvoiceToPandaDoc(
    {
      getInvoice: getImportedInvoiceForUser,
      getPandaDocConnection: findUserConnection,
      getAccessToken: getPandaDocAccessToken,
      claimSlot: claimDocumentImportSlot,
      createDocument: createPandaDocDocumentFromTemplate,
      fetchDocumentDetails: fetchPandaDocDocumentDetails,
      finalizeImport: finalizeDocumentImport,
      updateLinkState: updateDocumentLinkState,
      markImportError: markDocumentImportError,
      sendDocument: sendPandaDocDocument,
    },
    input,
  );
}
