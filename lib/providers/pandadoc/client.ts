import { env, isPandaDocMockMode } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import { getHttpErrorDetails, getOutboundRequestSignal } from "@/lib/utils/http";

import {
  pandaDocCreateDocumentResponseSchema,
  pandaDocCurrentMemberSchema,
  pandaDocDocumentDetailsSchema,
  type PandaDocDocumentRecipient,
  type PandaDocDocumentToken,
} from "./schemas";
import {
  createMockPandaDocDocument,
  getMockPandaDocDocumentDetails,
  getMockPandaDocMember,
} from "./mock";

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
  if (isPandaDocMockMode()) {
    return getMockPandaDocMember();
  }

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
  if (isPandaDocMockMode()) {
    return createMockPandaDocDocument({
      name: input.name,
      recipients: input.recipients,
      tokens: input.tokens,
      metadata: input.metadata,
    });
  }

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
  if (isPandaDocMockMode()) {
    return getMockPandaDocDocumentDetails({ documentId });
  }

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
  if (isPandaDocMockMode()) {
    return {
      ok: true,
      payload: {
        id: input.documentId,
        status: "document.sent",
      },
    };
  }

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
