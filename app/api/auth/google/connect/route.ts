import { NextResponse } from "next/server";
import { AuthIdentityProvider } from "@prisma/client";

import { createAuthLoginState } from "@/lib/db/auth";
import { logger } from "@/lib/logging/logger";
import { buildGoogleAuthorizationUrl } from "@/lib/providers/google/oauth";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  try {
    assertValidAppRequestOrigin(request);

    const rateLimit = await enforceRateLimit({
      key: `auth:google:connect:${getRequestIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.redirect(
        new URL("/login?error=Rate%20limit%20reached", request.url),
        303,
      );
    }

    const authState = await createAuthLoginState({
      provider: AuthIdentityProvider.GOOGLE,
      redirectTo: "/factoring-dashboard",
    });

    return NextResponse.redirect(
      buildGoogleAuthorizationUrl(authState.state),
      303,
    );
  } catch (error) {
    logger.error("google.connect_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(publicError.message)}`, request.url),
      303,
    );
  }
}
