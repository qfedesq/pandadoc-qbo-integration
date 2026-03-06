import { NextResponse } from "next/server";
import { Provider } from "@prisma/client";
import { z } from "zod";

import { getCurrentSessionUser } from "@/lib/auth/session";
import { disconnectConnection, findUserConnection } from "@/lib/db/integrations";
import { logger } from "@/lib/logging/logger";
import { revokeQuickBooksToken } from "@/lib/providers/quickbooks/oauth";
import { decryptSecret } from "@/lib/security/encryption";
import { assertValidAppRequestOrigin } from "@/lib/security/origin";
import { getPublicError } from "@/lib/utils/errors";

const providerSchema = z.enum(["pandadoc", "quickbooks"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    assertValidAppRequestOrigin(request);

    const { provider: rawProvider } = await context.params;
    const provider = providerSchema.parse(rawProvider);
    const normalizedProvider =
      provider === "pandadoc" ? Provider.PANDADOC : Provider.QUICKBOOKS;

    const connection = await findUserConnection(user.id, normalizedProvider);

    if (normalizedProvider === Provider.QUICKBOOKS && connection?.token) {
      try {
        await revokeQuickBooksToken(
          decryptSecret(connection.token.refreshTokenEncrypted),
        );
      } catch (error) {
        logger.warn("quickbooks.revoke_failed", {
          connectionId: connection.id,
          error,
        });
      }
    }

    await disconnectConnection(user.id, normalizedProvider);

    return NextResponse.redirect(
      new URL("/integrations?notice=Connection%20removed", request.url),
      303,
    );
  } catch (error) {
    logger.error("integrations.disconnect_failed", { error });
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
