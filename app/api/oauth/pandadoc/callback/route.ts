import { Provider } from "@prisma/client";
import { NextResponse } from "next/server";

import { claimOAuthState, upsertPandaDocConnection } from "@/lib/db/integrations";
import { logger } from "@/lib/logging/logger";
import {
  exchangePandaDocCode,
  fetchPandaDocCurrentMember,
  handlePandaDocOAuthCallback,
} from "@/lib/providers/pandadoc/oauth";
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
      key: `oauth:callback:pandadoc:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return buildRedirect(request, "/integrations", "error", "Rate limit reached");
    }

    const url = new URL(request.url);
    const result = await handlePandaDocOAuthCallback(
      {
        claimState: (state, now) =>
          claimOAuthState(Provider.PANDADOC, state, now),
        exchangeCode: exchangePandaDocCode,
        fetchCurrentMember: fetchPandaDocCurrentMember,
        persistConnection: upsertPandaDocConnection,
      },
      {
        code: url.searchParams.get("code"),
        state: url.searchParams.get("state"),
        error: url.searchParams.get("error"),
        errorDescription: url.searchParams.get("error_description"),
      },
    );

    return buildRedirect(
      request,
      result.redirectTo,
      "notice",
      "PandaDoc connected successfully.",
    );
  } catch (error) {
    logger.error("pandadoc.callback_failed", { error });
    const publicError = getPublicError(error);
    return buildRedirect(
      request,
      "/integrations",
      "error",
      publicError.message,
    );
  }
}
