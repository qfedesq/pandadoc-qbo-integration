import { AuthIdentityProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import { claimAuthLoginState, upsertGoogleUserIdentity } from "@/lib/db/auth";
import { logger } from "@/lib/logging/logger";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  handleGoogleOAuthCallback,
} from "@/lib/providers/google/oauth";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

function buildRedirect(
  request: Request,
  path: string,
  key: "notice" | "error",
  value: string,
) {
  const url = new URL(path, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      key: `auth:google:callback:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return buildRedirect(request, "/login", "error", "Rate limit reached");
    }

    const url = new URL(request.url);
    const result = await handleGoogleOAuthCallback(
      {
        claimState: (state, now) =>
          claimAuthLoginState(AuthIdentityProvider.GOOGLE, state, now),
        exchangeCode: exchangeGoogleCode,
        fetchUserInfo: fetchGoogleUserInfo,
        upsertUserIdentity: upsertGoogleUserIdentity,
        createAppSession: createSession,
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
      "Signed in with Google successfully.",
    );
  } catch (error) {
    logger.error("google.callback_failed", { error });
    const publicError = getPublicError(error);
    return buildRedirect(request, "/login", "error", publicError.message);
  }
}
