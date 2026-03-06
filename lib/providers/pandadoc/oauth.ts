import { env, hasPandaDocOauthConfig } from "@/lib/env";
import { incrementMetric } from "@/lib/observability/metrics";
import { AppError } from "@/lib/utils/errors";
import { getHttpErrorDetails, getOutboundRequestSignal } from "@/lib/utils/http";

import { fetchPandaDocCurrentMember } from "./client";
import {
  pandaDocTokenResponseSchema,
  type PandaDocCurrentMember,
  type PandaDocTokenResponse,
} from "./schemas";

function getScopeString() {
  return env.PANDADOC_SCOPES.replace(/\s+/g, "+");
}

function mapPandaDocToken(token: PandaDocTokenResponse) {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresInSeconds: token.expires_in,
    refreshTokenExpiresInSeconds: token.refresh_expires_in,
    tokenType: token.token_type,
    scope: token.scope,
  };
}

async function pandaDocTokenRequest(body: URLSearchParams) {
  const response = await fetch(env.PANDADOC_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: getOutboundRequestSignal(),
  });

  if (!response.ok) {
    const detail = await getHttpErrorDetails(response);
    throw new AppError(
      detail
        ? `PandaDoc token request failed: ${detail}`
        : `PandaDoc token request failed with ${response.status}.`,
      response.status,
      "PANDADOC_TOKEN_ERROR",
    );
  }

  return pandaDocTokenResponseSchema.parse(await response.json());
}

export function buildPandaDocAuthorizationUrl(state: string) {
  if (!hasPandaDocOauthConfig()) {
    throw new AppError(
      "PandaDoc OAuth credentials are not configured.",
      500,
      "PANDADOC_CONFIG_ERROR",
    );
  }

  const url = new URL(env.PANDADOC_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.PANDADOC_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.PANDADOC_REDIRECT_URI);
  url.searchParams.set("scope", getScopeString());
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangePandaDocCode(code: string) {
  const token = await pandaDocTokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: env.PANDADOC_CLIENT_ID,
      client_secret: env.PANDADOC_CLIENT_SECRET,
      redirect_uri: env.PANDADOC_REDIRECT_URI,
    }),
  );

  return mapPandaDocToken(token);
}

export async function refreshPandaDocToken(refreshToken: string) {
  const token = await pandaDocTokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.PANDADOC_CLIENT_ID,
      client_secret: env.PANDADOC_CLIENT_SECRET,
    }),
  );

  return mapPandaDocToken(token);
}

type ClaimedOAuthState = {
  id: string;
  userId: string;
  redirectTo: string | null;
};

type CallbackDeps = {
  now?: () => Date;
  claimState: (
    state: string,
    now: Date,
  ) => Promise<
    | { status: "claimed"; state: ClaimedOAuthState }
    | { status: "missing" | "consumed" | "expired" }
  >;
  exchangeCode: (code: string) => Promise<ReturnType<typeof mapPandaDocToken>>;
  fetchCurrentMember: (accessToken: string) => Promise<PandaDocCurrentMember>;
  persistConnection: (input: {
    userId: string;
    accountId: string;
    displayName: string;
    accountName: string;
    metadata: Record<string, string | null>;
    tokens: ReturnType<typeof mapPandaDocToken>;
  }) => Promise<unknown>;
};

function buildDisplayName(member: PandaDocCurrentMember) {
  const fullName = [member.first_name, member.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || member.email || "Connected PandaDoc account";
}

export async function handlePandaDocOAuthCallback(
  deps: CallbackDeps,
  input: {
    code?: string | null;
    state?: string | null;
    error?: string | null;
    errorDescription?: string | null;
  },
) {
  if (input.error) {
    await incrementMetric("oauth_callback_error", "pandadoc");
    throw new AppError(
      input.errorDescription ?? input.error,
      400,
      "PANDADOC_OAUTH_DENIED",
    );
  }

  if (!input.code || !input.state) {
    throw new AppError(
      "Missing required PandaDoc OAuth callback parameters.",
      400,
      "PANDADOC_OAUTH_INVALID_CALLBACK",
    );
  }

  const now = deps.now?.() ?? new Date();
  const claimedState = await deps.claimState(input.state, now);

  if (claimedState.status === "missing") {
    throw new AppError("Invalid PandaDoc OAuth state.", 400, "OAUTH_STATE");
  }

  if (claimedState.status === "consumed") {
    throw new AppError(
      "This PandaDoc OAuth state has already been used.",
      400,
      "OAUTH_STATE_CONSUMED",
    );
  }

  if (claimedState.status === "expired") {
    throw new AppError(
      "This PandaDoc OAuth state has expired.",
      400,
      "OAUTH_STATE_EXPIRED",
    );
  }

  if (claimedState.status !== "claimed") {
    throw new AppError("Invalid PandaDoc OAuth state.", 400, "OAUTH_STATE");
  }

  const oauthState = claimedState.state;

  const tokenSet = await deps.exchangeCode(input.code);
  const member = await deps.fetchCurrentMember(tokenSet.accessToken);
  const accountId = member.user_id ?? member.membership_id ?? member.id;

  if (!accountId) {
    throw new AppError(
      "PandaDoc account identifier is missing from the profile response.",
      400,
      "PANDADOC_ACCOUNT_MISSING",
    );
  }

  await deps.persistConnection({
    userId: oauthState.userId,
    accountId,
    displayName: buildDisplayName(member),
    accountName: member.workspace_name ?? member.email ?? accountId,
    metadata: {
      email: member.email ?? null,
      workspaceId: member.workspace_id ?? null,
      workspaceName: member.workspace_name ?? null,
      connectedAt: now.toISOString(),
    },
    tokens: tokenSet,
  });

  return {
    redirectTo: oauthState.redirectTo ?? "/integrations",
  };
}

export { fetchPandaDocCurrentMember };
