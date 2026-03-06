import {
  type DocumentInvoiceLink,
  type InvoiceStatus,
  Prisma,
} from "@prisma/client";

import { buildImportedInvoiceWhereInput } from "@/lib/db/invoices";
import { isRetryablePandaDocDocumentStatus } from "@/lib/pandadoc/document-status";
import { prisma } from "@/lib/db/prisma";
import { createOpaqueToken } from "@/lib/security/hash";

const documentLinkInclude = {
  importedInvoice: true,
  pandadocConnection: true,
} satisfies Prisma.DocumentInvoiceLinkInclude;

export type DocumentLinkWithRelations = Prisma.DocumentInvoiceLinkGetPayload<{
  include: typeof documentLinkInclude;
}>;

export function isRetryableImportStatus(status?: string | null) {
  return isRetryablePandaDocDocumentStatus(status);
}

export async function getDocumentLinkForInvoice(
  userId: string,
  importedInvoiceId: string,
) {
  return prisma.documentInvoiceLink.findUnique({
    where: {
      userId_importedInvoiceId: {
        userId,
        importedInvoiceId,
      },
    },
    include: documentLinkInclude,
  });
}

export async function findDocumentLinkByDocumentId(
  documentId: string,
) {
  return prisma.documentInvoiceLink.findFirst({
    where: {
      pandadocDocumentId: documentId,
    },
    include: documentLinkInclude,
  });
}

export async function claimDocumentImportSlot(input: {
  userId: string;
  importedInvoiceId: string;
  pandadocConnectionId: string;
  documentName: string;
  autoSend: boolean;
}) {
  const placeholderDocumentId = `pending:${createOpaqueToken(12)}`;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.documentInvoiceLink.findUnique({
      where: {
        userId_importedInvoiceId: {
          userId: input.userId,
          importedInvoiceId: input.importedInvoiceId,
        },
      },
    });

    if (!existing) {
      const link = await tx.documentInvoiceLink.create({
        data: {
          userId: input.userId,
          importedInvoiceId: input.importedInvoiceId,
          pandadocConnectionId: input.pandadocConnectionId,
          pandadocDocumentId: placeholderDocumentId,
          documentName: input.documentName,
          pandadocDocumentStatus: "document.importing",
          autoSend: input.autoSend,
          lastSyncedAt: now,
        },
      });

      return {
        mode: "claimed" as const,
        link,
      };
    }

    if (!isRetryableImportStatus(existing.pandadocDocumentStatus)) {
      return {
        mode: "existing" as const,
        link: existing,
      };
    }

    const link = await tx.documentInvoiceLink.update({
      where: {
        id: existing.id,
      },
      data: {
        pandadocConnectionId: input.pandadocConnectionId,
        pandadocDocumentId: placeholderDocumentId,
        documentName: input.documentName,
        pandadocDocumentStatus: "document.importing",
        autoSend: input.autoSend,
        lastError: null,
        lastSyncedAt: now,
        sentAt: null,
      },
    });

    return {
      mode: "claimed" as const,
      link,
    };
  });
}

export async function finalizeDocumentImport(input: {
  linkId: string;
  pandadocDocumentId: string;
  documentName?: string | null;
  status?: string | null;
  metadata?: Prisma.InputJsonObject;
}) {
  return prisma.documentInvoiceLink.update({
    where: {
      id: input.linkId,
    },
    data: {
      pandadocDocumentId: input.pandadocDocumentId,
      documentName: input.documentName ?? undefined,
      pandadocDocumentStatus: input.status ?? undefined,
      metadata: input.metadata,
      lastError: null,
      lastSyncedAt: new Date(),
    },
    include: documentLinkInclude,
  });
}

export async function markDocumentImportError(linkId: string, message: string) {
  return prisma.documentInvoiceLink.update({
    where: {
      id: linkId,
    },
    data: {
      pandadocDocumentStatus: "import.error",
      lastError: message,
      lastSyncedAt: new Date(),
    },
  });
}

export async function updateDocumentLinkState(input: {
  linkId: string;
  status?: string | null;
  documentName?: string | null;
  metadata?: Prisma.InputJsonObject;
  lastError?: string | null;
  sentAt?: Date | null;
}) {
  return prisma.documentInvoiceLink.update({
    where: {
      id: input.linkId,
    },
    data: {
      pandadocDocumentStatus: input.status ?? undefined,
      documentName: input.documentName ?? undefined,
      metadata: input.metadata,
      lastError: input.lastError ?? undefined,
      sentAt: input.sentAt ?? undefined,
      lastSyncedAt: new Date(),
    },
    include: documentLinkInclude,
  });
}

export async function listInvoicesWithDocumentLinksForUser(input: {
  userId: string;
  search?: string;
  status?: InvoiceStatus | "ALL";
  overdueOnly?: boolean;
}) {
  return prisma.importedInvoice.findMany({
    where: buildImportedInvoiceWhereInput({
      userId: input.userId,
      search: input.search,
      status: input.status,
      overdueOnly: input.overdueOnly,
    }),
    include: {
      documentLinks: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { lastSyncedAt: "desc" }],
  });
}

export function getPrimaryDocumentLink(
  links: DocumentInvoiceLink[],
) {
  return links[0] ?? null;
}
