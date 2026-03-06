import { addMinutes } from "date-fns";

import { env, hasQuickBooksOauthConfig } from "@/lib/env";
import { incrementMetric } from "@/lib/observability/metrics";
import { AppError } from "@/lib/utils/errors";
import { getHttpErrorDetails, getOutboundRequestSignal } from "@/lib/utils/http";

import { fetchQuickBooksCompanyInfo } from "./client";
import {
  quickBooksTokenResponseSchema,
  type QuickBooksTokenResponse,
} from "./schemas";

function buildQuickBooksBasicAuthHeader() {
  const credentials = Buffer.from(
    `${env.QUICKBOOKS_CLIENT_ID}:${env.QUICKBOOKS_CLIENT_SECRET}`,
  ).toString("base64");

  return `Basic ${credentials}`;
}

function getScopeString() {
  return env.QUICKBOOKS_SCOPES.replace(/,/g, " ");
}

export function buildQuickBooksAuthorizationUrl(state: string) {
  if (!hasQuickBooksOauthConfig()) {
    throw new AppError(
      "QuickBooks OAuth credentials are not configured.",
      500,
      "QUICKBOOKS_CONFIG_ERROR",
    );
  }

  const url = new URL(env.QUICKBOOKS_AUTH_URL);
  url.searchParams.set("client_id", env.QUICKBOOKS_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.QUICKBOOKS_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getScopeString());
  url.searchParams.set("state", state);

  return url.toString();
}

async function quickBooksTokenRequest(body: URLSearchParams) {
  const response = await fetch(env.QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: buildQuickBooksBasicAuthHeader(),
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
        ? `QuickBooks token request failed: ${detail}`
        : `QuickBooks token request failed with ${response.status}.`,
      response.status,
      "QUICKBOOKS_TOKEN_ERROR",
    );
  }

  return quickBooksTokenResponseSchema.parse(await response.json());
}

export async function exchangeQuickBooksCode(code: string) {
  const token = await quickBooksTokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.QUICKBOOKS_REDIRECT_URI,
    }),
  );

  return mapQuickBooksToken(token);
}

export async function refreshQuickBooksToken(refreshToken: string) {
  const token = await quickBooksTokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );

  return mapQuickBooksToken(token);
}

export async function revokeQuickBooksToken(token: string) {
  const response = await fetch(
    "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: buildQuickBooksBasicAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
      }),
      signal: getOutboundRequestSignal(),
    },
  );

  if (!response.ok && response.status !== 200) {
    const detail = await getHttpErrorDetails(response);
    throw new AppError(
      detail
        ? `QuickBooks revoke request failed: ${detail}`
        : `QuickBooks revoke request failed with ${response.status}.`,
      response.status,
      "QUICKBOOKS_REVOKE_ERROR",
    );
  }
}

function mapQuickBooksToken(token: QuickBooksTokenResponse) {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresInSeconds: token.expires_in,
    refreshTokenExpiresInSeconds: token.x_refresh_token_expires_in,
    tokenType: token.token_type,
    scope: token.scope,
  };
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
  exchangeCode: (code: string) => Promise<ReturnType<typeof mapQuickBooksToken>>;
  fetchCompany: typeof fetchQuickBooksCompanyInfo;
  persistConnection: (input: {
    userId: string;
    realmId: string;
    companyName?: string | null;
    country?: string | null;
    currency?: string | null;
    metadata: Record<string, string | number | boolean | null>;
    tokens: ReturnType<typeof mapQuickBooksToken>;
  }) => Promise<unknown>;
};

export async function handleQuickBooksOAuthCallback(
  deps: CallbackDeps,
  input: {
    code?: string | null;
    state?: string | null;
    realmId?: string | null;
    error?: string | null;
    errorDescription?: string | null;
  },
) {
  if (input.error) {
    await incrementMetric("oauth_callback_error", "quickbooks");
    throw new AppError(
      input.errorDescription ?? input.error,
      400,
      "QUICKBOOKS_OAUTH_DENIED",
    );
  }

  if (!input.code || !input.state || !input.realmId) {
    throw new AppError(
      "Missing required QuickBooks OAuth callback parameters.",
      400,
      "QUICKBOOKS_OAUTH_INVALID_CALLBACK",
    );
  }

  const now = deps.now?.() ?? new Date();
  const claimedState = await deps.claimState(input.state, now);

  if (claimedState.status === "missing") {
    throw new AppError("Invalid QuickBooks OAuth state.", 400, "OAUTH_STATE");
  }

  if (claimedState.status === "consumed") {
    throw new AppError(
      "This QuickBooks OAuth state has already been used.",
      400,
      "OAUTH_STATE_CONSUMED",
    );
  }

  if (claimedState.status === "expired") {
    throw new AppError(
      "This QuickBooks OAuth state has expired.",
      400,
      "OAUTH_STATE_EXPIRED",
    );
  }

  if (claimedState.status !== "claimed") {
    throw new AppError("Invalid QuickBooks OAuth state.", 400, "OAUTH_STATE");
  }

  const oauthState = claimedState.state;

  const tokenSet = await deps.exchangeCode(input.code);
  const company = await deps.fetchCompany(tokenSet.accessToken, input.realmId);

  await deps.persistConnection({
    userId: oauthState.userId,
    realmId: input.realmId,
    companyName: company.companyName,
    country: company.country,
    currency: company.currency,
    metadata: {
      realmId: input.realmId,
      connectedAt: now.toISOString(),
      tokenRefreshDeadline: addMinutes(
        now,
        Math.max(tokenSet.expiresInSeconds - 300, 60),
      ).toISOString(),
    },
    tokens: tokenSet,
  });

  return {
    redirectTo: oauthState.redirectTo ?? "/integrations",
  };
}
