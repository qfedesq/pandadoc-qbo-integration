import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import { getHttpErrorDetails, getOutboundRequestSignal } from "@/lib/utils/http";

import {
  quickBooksCompanyResponseSchema,
  quickBooksQueryResponseSchema,
  type QuickBooksInvoice,
} from "./schemas";

function getQuickBooksApiBaseUrl() {
  return env.QUICKBOOKS_ENV === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

async function parseJson<T>(
  response: Response,
  parser: { parse(input: unknown): T },
) {
  const payload = await response.json();
  return parser.parse(payload);
}

async function quickBooksApiFetch(
  accessToken: string,
  pathname: string,
  init?: RequestInit,
) {
  const response = await fetch(`${getQuickBooksApiBaseUrl()}${pathname}`, {
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
        ? `QuickBooks API request failed: ${detail}`
        : `QuickBooks API request failed with ${response.status}.`,
      response.status,
      "QUICKBOOKS_API_ERROR",
    );
  }

  return response;
}

function buildInvoiceQuery(options: {
  startPosition: number;
  pageSize: number;
  updatedAfter?: Date;
  outstandingOnly: boolean;
}) {
  const filters: string[] = [];

  if (options.outstandingOnly) {
    filters.push("Balance > '0'");
  }

  if (options.updatedAfter) {
    filters.push(
      `MetaData.LastUpdatedTime >= '${options.updatedAfter.toISOString()}'`,
    );
  }

  const whereClause = filters.length > 0 ? ` WHERE ${filters.join(" AND ")}` : "";

  return `SELECT * FROM Invoice${whereClause} STARTPOSITION ${options.startPosition} MAXRESULTS ${options.pageSize}`;
}

export async function fetchQuickBooksCompanyInfo(
  accessToken: string,
  realmId: string,
) {
  const response = await quickBooksApiFetch(
    accessToken,
    `/v3/company/${realmId}/companyinfo/${realmId}?minorversion=${env.QUICKBOOKS_MINOR_VERSION}`,
  );
  const parsed = await parseJson(response, quickBooksCompanyResponseSchema);

  return {
    realmId: parsed.CompanyInfo.Id,
    companyName: parsed.CompanyInfo.CompanyName ?? undefined,
    country: parsed.CompanyInfo.Country ?? undefined,
    currency:
      parsed.CompanyInfo.CurrencyRef?.value ??
      parsed.CompanyInfo.CurrencyRef?.name ??
      undefined,
  };
}

export async function fetchQuickBooksInvoices(input: {
  accessToken: string;
  realmId: string;
  updatedAfter?: Date;
  outstandingOnly: boolean;
  pageSize?: number;
}) {
  const pageSize = input.pageSize ?? 500;
  const invoices: QuickBooksInvoice[] = [];
  let startPosition = 1;

  while (true) {
    const response = await quickBooksApiFetch(
      input.accessToken,
      `/v3/company/${input.realmId}/query?minorversion=${env.QUICKBOOKS_MINOR_VERSION}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/text",
        },
        body: buildInvoiceQuery({
          startPosition,
          pageSize,
          updatedAfter: input.updatedAfter,
          outstandingOnly: input.outstandingOnly,
        }),
      },
    );

    const parsed = await parseJson(response, quickBooksQueryResponseSchema);
    const batch = parsed.QueryResponse.Invoice ?? [];

    invoices.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    startPosition += pageSize;
  }

  return invoices;
}
