import { NextResponse } from "next/server";
import { Provider } from "@prisma/client";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { createOAuthState } from "@/lib/db/integrations";
import { logger } from "@/lib/logging/logger";
import { buildPandaDocAuthorizationUrl } from "@/lib/providers/pandadoc/oauth";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { enforceRateLimit, getRequestIp } from "@/lib/security/rate-limit";
import { getPublicError } from "@/lib/utils/errors";

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    assertValidAppRequestOrigin(request);

    const rateLimit = await enforceRateLimit({
      key: `oauth:connect:pandadoc:${getRequestIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.redirect(
        new URL("/integrations?error=Rate%20limit%20reached", request.url),
      );
    }

    const oauthState = await createOAuthState({
      userId: user.id,
      provider: Provider.PANDADOC,
      redirectTo: "/integrations",
    });

    return NextResponse.redirect(
      buildPandaDocAuthorizationUrl(oauthState.state),
      303,
    );
  } catch (error) {
    logger.error("pandadoc.connect_failed", { error });
    const publicError = getPublicError(error);
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(publicError.message)}`,
        request.url,
      ),
      303,
    );
  }
}
