import { addMinutes } from "date-fns";

import {
  getConnectionWithSecrets,
  markConnectionError,
  updateConnectionToken,
} from "@/lib/db/integrations";
import { logger } from "@/lib/logging/logger";
import { incrementMetric } from "@/lib/observability/metrics";
import { decryptSecret } from "@/lib/security/encryption";
import { AppError, getErrorMessage } from "@/lib/utils/errors";

import { refreshPandaDocToken } from "./oauth";

export async function getPandaDocAccessToken(connectionId: string) {
  const connection = await getConnectionWithSecrets(connectionId);

  if (!connection || connection.provider !== "PANDADOC") {
    throw new AppError(
      "PandaDoc connection not found.",
      404,
      "PANDADOC_CONNECTION_NOT_FOUND",
    );
  }

  if (!connection.token) {
    throw new AppError(
      "PandaDoc token record is missing.",
      400,
      "PANDADOC_TOKEN_MISSING",
    );
  }

  const expiresSoon =
    connection.token.accessTokenExpiresAt <= addMinutes(new Date(), 5);

  if (!expiresSoon) {
    return decryptSecret(connection.token.accessTokenEncrypted);
  }

  try {
    const refreshed = await refreshPandaDocToken(
      decryptSecret(connection.token.refreshTokenEncrypted),
    );

    await updateConnectionToken(connection.id, refreshed);

    return refreshed.accessToken;
  } catch (error) {
    const message = getErrorMessage(error);
    await markConnectionError(connection.id, message);
    await incrementMetric("token_refresh_error", "pandadoc");
    logger.error("pandadoc.token_refresh_failed", {
      connectionId: connection.id,
      error,
    });
    throw error;
  }
}
