import { Provider } from "@prisma/client";
import { NextResponse } from "next/server";

import { claimOAuthState, upsertQuickBooksConnection } from "@/lib/db/integrations";
import { logger } from "@/lib/logging/logger";
import {
  exchangeQuickBooksCode,
  handleQuickBooksOAuthCallback,
} from "@/lib/providers/quickbooks/oauth";
import { fetchQuickBooksCompanyInfo } from "@/lib/providers/quickbooks/client";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

function buildRedirect(request: Request, path: string, key: "notice" | "error", value: string) {
  const url = new URL(path, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      key: `oauth:callback:quickbooks:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return buildRedirect(request, "/integrations", "error", "Rate limit reached");
    }

    const url = new URL(request.url);
    const result = await handleQuickBooksOAuthCallback(
      {
        claimState: (state, now) =>
          claimOAuthState(Provider.QUICKBOOKS, state, now),
        exchangeCode: exchangeQuickBooksCode,
        fetchCompany: fetchQuickBooksCompanyInfo,
        persistConnection: upsertQuickBooksConnection,
      },
      {
        code: url.searchParams.get("code"),
        state: url.searchParams.get("state"),
        realmId: url.searchParams.get("realmId"),
        error: url.searchParams.get("error"),
        errorDescription: url.searchParams.get("error_description"),
      },
    );

    return buildRedirect(
      request,
      result.redirectTo,
      "notice",
      "QuickBooks connected successfully.",
    );
  } catch (error) {
    logger.error("quickbooks.callback_failed", { error });
    const publicError = getPublicError(error);
    return buildRedirect(
      request,
      "/integrations",
      "error",
      publicError.message,
    );
  }
}
