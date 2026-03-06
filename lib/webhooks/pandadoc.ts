import { createHmac } from "crypto";
import { Prisma, Provider } from "@prisma/client";

import {
  findDocumentLinkByDocumentId,
  updateDocumentLinkState,
} from "@/lib/db/document-links";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { incrementMetric } from "@/lib/observability/metrics";
import { sendPandaDocDocument } from "@/lib/providers/pandadoc/client";
import { getPandaDocAccessToken } from "@/lib/providers/pandadoc/tokens";
import { safeEqual, sha256 } from "@/lib/security/hash";
import {
  toPrismaInputJsonObject,
  toPrismaInputJsonValue,
} from "@/lib/utils/prisma-json";

import { pandaDocWebhookEventSchema, type PandaDocWebhookEvent } from "@/lib/providers/pandadoc/schemas";

function extractString(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function normalizeSignature(value: string) {
  return value.replace(/^sha256=/i, "").trim();
}

function getWebhookSignature(request: Request) {
  const url = new URL(request.url);

  return (
    url.searchParams.get("signature") ??
    request.headers.get("x-pandadoc-signature") ??
    ""
  );
}

export function validatePandaDocWebhookSignature(input: {
  rawBody: string;
  request: Request;
}) {
  if (!env.PANDADOC_WEBHOOK_SHARED_SECRET) {
    return null;
  }

  const signature = getWebhookSignature(input.request);

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", env.PANDADOC_WEBHOOK_SHARED_SECRET)
    .update(input.rawBody, "utf8")
    .digest("hex");

  return safeEqual(normalizeSignature(signature), expected);
}

export function parsePandaDocWebhookEvents(payload: unknown) {
  const rawEvents = Array.isArray(payload) ? payload : [payload];
  return rawEvents.map((event) => pandaDocWebhookEventSchema.parse(event));
}

export async function storePandaDocWebhookEvent(input: {
  rawBody: string;
  payload: unknown;
  request: Request;
  signatureValidated: boolean | null;
}) {
  const payloadHash = sha256(input.rawBody);
  const events = parsePandaDocWebhookEvents(input.payload);
  const firstEvent = events[0] ?? null;

  try {
    const record = await prisma.webhookEventLog.create({
      data: {
        provider: Provider.PANDADOC,
        externalEventId: extractString(firstEvent, ["id", "event_id"]),
        eventType: extractString(firstEvent, ["event", "type", "event_type"]),
        signatureValidated: input.signatureValidated,
        deliveryKey:
          input.request.headers.get("x-request-id") ??
          input.request.headers.get("x-pandadoc-delivery-id") ??
          undefined,
        payloadHash,
        headers: toPrismaInputJsonObject(
          Object.fromEntries(input.request.headers.entries()),
        ),
        payload: toPrismaInputJsonValue(input.payload),
      },
    });

    await incrementMetric("webhook_received", "pandadoc");

    return {
      duplicate: false,
      record,
      events,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.webhookEventLog.findUnique({
        where: {
          provider_payloadHash: {
            provider: Provider.PANDADOC,
            payloadHash,
          },
        },
      });

      if (existing) {
        return {
          duplicate: true,
          record: existing,
          events,
        };
      }
    }

    throw error;
  }
}

export async function markPandaDocWebhookEventProcessed(recordId: string) {
  return prisma.webhookEventLog.update({
    where: {
      id: recordId,
    },
    data: {
      processedAt: new Date(),
    },
  });
}

function getEventType(event: PandaDocWebhookEvent) {
  return event.event ?? event.type ?? event.event_type ?? "unknown";
}

function getEventData(event: PandaDocWebhookEvent) {
  return event.data && typeof event.data === "object"
    ? (event.data as Record<string, unknown>)
    : {};
}

function getNestedDocumentRecord(event: PandaDocWebhookEvent) {
  const data = getEventData(event);
  const nested = data.document;

  if (nested && typeof nested === "object") {
    return nested as Record<string, unknown>;
  }

  return null;
}

function getDocumentId(event: PandaDocWebhookEvent) {
  const data = getEventData(event);
  const nestedDocument = getNestedDocumentRecord(event);

  return (
    extractString(nestedDocument, ["id"]) ??
    extractString(data, ["id", "document_id"]) ??
    extractString(event, ["id"])
  );
}

function getDocumentStatus(event: PandaDocWebhookEvent) {
  const eventType = getEventType(event);
  const data = getEventData(event);
  const nestedDocument = getNestedDocumentRecord(event);

  if (eventType === "document_creation_failed") {
    return "document.creation_failed";
  }

  return (
    extractString(nestedDocument, ["status"]) ??
    extractString(data, ["status", "document_status"]) ??
    eventType
  );
}

function getDocumentName(event: PandaDocWebhookEvent) {
  return (
    extractString(getNestedDocumentRecord(event), ["name"]) ??
    extractString(getEventData(event), ["name", "document_name"])
  );
}

function getEventError(event: PandaDocWebhookEvent) {
  const data = getEventData(event);

  return (
    extractString(data, ["error", "error_message", "message", "detail"]) ??
    extractString(event, ["error"])
  );
}

function buildSendMessage(link: Awaited<ReturnType<typeof findDocumentLinkByDocumentId>>) {
  if (!link) {
    return null;
  }

  const invoice = link.importedInvoice;
  const documentName =
    link.documentName ??
    `Invoice ${invoice.docNumber ?? invoice.providerInvoiceId}`;

  return {
    subject: documentName,
    message: `Please review and complete payment for invoice ${
      invoice.docNumber ?? invoice.providerInvoiceId
    }.`,
  };
}

type ProcessWebhookDeps = {
  findLinkByDocumentId: typeof findDocumentLinkByDocumentId;
  updateLinkState: typeof updateDocumentLinkState;
  getAccessToken: typeof getPandaDocAccessToken;
  sendDocument: typeof sendPandaDocDocument;
  now?: () => Date;
};

export async function processPandaDocWebhookEvents(
  deps: ProcessWebhookDeps,
  events: PandaDocWebhookEvent[],
) {
  for (const event of events) {
    const documentId = getDocumentId(event);

    if (!documentId) {
      continue;
    }

    const link = await deps.findLinkByDocumentId(documentId);

    if (!link) {
      continue;
    }

    const eventType = getEventType(event);
    const status = getDocumentStatus(event);
    const documentName = getDocumentName(event) ?? link.documentName;
    const eventError = getEventError(event);

    if (
      link.autoSend &&
      !link.sentAt &&
      status === "document.draft" &&
      link.pandadocConnectionId
    ) {
      try {
        const accessToken = await deps.getAccessToken(link.pandadocConnectionId);
        const sendMessage = buildSendMessage(link);

        if (sendMessage) {
          await deps.sendDocument({
            accessToken,
            documentId,
            subject: sendMessage.subject,
            message: sendMessage.message,
          });
        }

        await deps.updateLinkState({
          linkId: link.id,
          status: "document.sent",
          documentName,
          sentAt: deps.now?.() ?? new Date(),
          lastError: null,
        });
        continue;
      } catch (error) {
        logger.error("pandadoc.webhook_auto_send_failed", {
          linkId: link.id,
          documentId,
          error,
        });

        await deps.updateLinkState({
          linkId: link.id,
          status,
          documentName,
          lastError: getErrorMessage(error),
        });
        continue;
      }
    }

    await deps.updateLinkState({
      linkId: link.id,
      status,
      documentName,
      lastError: eventType === "document_creation_failed" ? eventError : null,
    });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export async function processPandaDocWebhookEventsDefault(
  events: PandaDocWebhookEvent[],
) {
  return processPandaDocWebhookEvents(
    {
      findLinkByDocumentId: findDocumentLinkByDocumentId,
      updateLinkState: updateDocumentLinkState,
      getAccessToken: getPandaDocAccessToken,
      sendDocument: sendPandaDocDocument,
    },
    events,
  );
}
