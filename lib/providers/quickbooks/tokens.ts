import { addMinutes } from "date-fns";

import {
  getConnectionWithSecrets,
  markConnectionError,
  updateConnectionToken,
  type ConnectionWithSecrets,
} from "@/lib/db/integrations";
import { logger } from "@/lib/logging/logger";
import { incrementMetric } from "@/lib/observability/metrics";
import { decryptSecret } from "@/lib/security/encryption";
import { AppError, getErrorMessage } from "@/lib/utils/errors";

import { refreshQuickBooksToken } from "./oauth";

async function refreshIfNeeded(connection: ConnectionWithSecrets) {
  if (!connection.token) {
    throw new AppError(
      "QuickBooks token record is missing for this connection.",
      400,
      "QUICKBOOKS_TOKEN_MISSING",
    );
  }

  const expiresSoon =
    connection.token.accessTokenExpiresAt <= addMinutes(new Date(), 5);

  if (!expiresSoon) {
    return {
      accessToken: decryptSecret(connection.token.accessTokenEncrypted),
      connection,
    };
  }

  try {
    const refreshed = await refreshQuickBooksToken(
      decryptSecret(connection.token.refreshTokenEncrypted),
    );

    await updateConnectionToken(connection.id, refreshed);
    const updatedConnection = await getConnectionWithSecrets(connection.id);

    if (!updatedConnection) {
      throw new AppError(
        "QuickBooks connection disappeared during token refresh.",
        500,
        "QUICKBOOKS_CONNECTION_REFRESH_FAILED",
      );
    }

    return {
      accessToken: refreshed.accessToken,
      connection: updatedConnection,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await markConnectionError(connection.id, message);
    await incrementMetric("token_refresh_error", "quickbooks");
    logger.error("quickbooks.token_refresh_failed", {
      connectionId: connection.id,
      error,
    });
    throw error;
  }
}

export async function getQuickBooksAccessContext(connectionId: string) {
  const connection = await getConnectionWithSecrets(connectionId);

  if (!connection || connection.provider !== "QUICKBOOKS") {
    throw new AppError(
      "QuickBooks connection not found.",
      404,
      "QUICKBOOKS_CONNECTION_NOT_FOUND",
    );
  }

  if (!connection.quickBooksCompany) {
    throw new AppError(
      "QuickBooks company information is missing.",
      400,
      "QUICKBOOKS_COMPANY_MISSING",
    );
  }

  if (!connection.token) {
    throw new AppError(
      "QuickBooks token record is missing.",
      400,
      "QUICKBOOKS_TOKEN_MISSING",
    );
  }

  const refreshed = await refreshIfNeeded(connection);

  if (!refreshed.connection.quickBooksCompany) {
    throw new AppError(
      "QuickBooks company information is missing.",
      400,
      "QUICKBOOKS_COMPANY_MISSING",
    );
  }

  return {
    connection: refreshed.connection,
    accessToken: refreshed.accessToken,
    realmId: refreshed.connection.quickBooksCompany.realmId,
    company: refreshed.connection.quickBooksCompany,
  };
}
