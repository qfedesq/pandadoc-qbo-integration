import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import { getHttpErrorDetails, getOutboundRequestSignal } from "@/lib/utils/http";

import {
  pandaDocCreateDocumentResponseSchema,
  pandaDocCurrentMemberSchema,
  pandaDocDocumentDetailsSchema,
  type PandaDocDocumentRecipient,
  type PandaDocDocumentToken,
} from "./schemas";

async function pandaDocApiFetch(
  accessToken: string,
  pathname: string,
  init?: RequestInit,
) {
  const response = await fetch(`${env.PANDADOC_API_BASE_URL}${pathname}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: init?.signal ?? getOutboundRequestSignal(),
  });

  if (!response.ok) {
    const detail = await getHttpErrorDetails(response);
    throw new AppError(
      detail
        ? `PandaDoc API request failed: ${detail}`
        : `PandaDoc API request failed with ${response.status}.`,
      response.status,
      "PANDADOC_API_ERROR",
    );
  }

  return response;
}

export async function fetchPandaDocCurrentMember(accessToken: string) {
  const response = await pandaDocApiFetch(accessToken, "/public/v1/members/current");
  const payload = await response.json();

  return pandaDocCurrentMemberSchema.parse(payload);
}

export async function createPandaDocDocumentFromTemplate(input: {
  accessToken: string;
  name: string;
  templateUuid: string;
  recipients: PandaDocDocumentRecipient[];
  tokens: PandaDocDocumentToken[];
  metadata?: Record<string, string>;
}) {
  const response = await pandaDocApiFetch(
    input.accessToken,
    "/public/v1/documents",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.name,
        template_uuid: input.templateUuid,
        recipients: input.recipients,
        tokens: input.tokens,
        metadata: input.metadata,
      }),
    },
  );

  return pandaDocCreateDocumentResponseSchema.parse(await response.json());
}

export async function fetchPandaDocDocumentDetails(
  accessToken: string,
  documentId: string,
) {
  const response = await pandaDocApiFetch(
    accessToken,
    `/public/v1/documents/${documentId}`,
  );

  return pandaDocDocumentDetailsSchema.parse(await response.json());
}

export async function sendPandaDocDocument(input: {
  accessToken: string;
  documentId: string;
  subject: string;
  message: string;
  silent?: boolean;
}) {
  const response = await pandaDocApiFetch(
    input.accessToken,
    `/public/v1/documents/${input.documentId}/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: input.subject,
        message: input.message,
        silent: input.silent ?? false,
      }),
    },
  );

  if (response.status === 204) {
    return { ok: true };
  }

  return {
    ok: true,
    payload: await response.json().catch(() => null),
  };
}
