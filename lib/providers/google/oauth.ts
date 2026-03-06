import { AuthIdentityProvider } from "@prisma/client";

import { env, getGoogleAllowedEmailDomains, hasGoogleOauthConfig } from "@/lib/env";
import { incrementMetric } from "@/lib/observability/metrics";
import { AppError } from "@/lib/utils/errors";
import { getHttpErrorDetails, getOutboundRequestSignal } from "@/lib/utils/http";

import {
  googleTokenResponseSchema,
  googleUserInfoSchema,
  type GoogleTokenResponse,
  type GoogleUserInfo,
} from "./schemas";

function getScopeString() {
  return env.GOOGLE_SCOPES.trim().replace(/\s+/g, " ");
}

async function googleTokenRequest(body: URLSearchParams) {
  const response = await fetch(env.GOOGLE_TOKEN_URL, {
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
        ? `Google token request failed: ${detail}`
        : `Google token request failed with ${response.status}.`,
      response.status,
      "GOOGLE_TOKEN_ERROR",
    );
  }

  return googleTokenResponseSchema.parse(await response.json());
}

export function buildGoogleAuthorizationUrl(state: string) {
  if (!hasGoogleOauthConfig()) {
    throw new AppError(
      "Google OAuth credentials are not configured.",
      500,
      "GOOGLE_CONFIG_ERROR",
    );
  }

  const url = new URL(env.GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getScopeString());
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

export async function exchangeGoogleCode(code: string) {
  const token = await googleTokenRequest(
    new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  );

  return {
    accessToken: token.access_token,
    tokenType: token.token_type,
    scope: token.scope,
    expiresInSeconds: token.expires_in,
    idToken: token.id_token,
    raw: token,
  };
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(env.GOOGLE_USERINFO_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: getOutboundRequestSignal(),
  });

  if (!response.ok) {
    const detail = await getHttpErrorDetails(response);
    throw new AppError(
      detail
        ? `Google userinfo request failed: ${detail}`
        : `Google userinfo request failed with ${response.status}.`,
      response.status,
      "GOOGLE_USERINFO_ERROR",
    );
  }

  return googleUserInfoSchema.parse(await response.json());
}

type ClaimedAuthState = {
  id: string;
  provider: AuthIdentityProvider;
  redirectTo: string | null;
};

type CallbackDeps = {
  now?: () => Date;
  claimState: (
    state: string,
    now: Date,
  ) => Promise<
    | { status: "claimed"; state: ClaimedAuthState }
    | { status: "missing" | "consumed" | "expired" }
  >;
  exchangeCode: (code: string) => Promise<{
    accessToken: string;
    tokenType: string;
    scope?: string;
    expiresInSeconds: number;
    idToken?: string;
    raw: GoogleTokenResponse;
  }>;
  fetchUserInfo: (accessToken: string) => Promise<GoogleUserInfo>;
  upsertUserIdentity: (input: {
    providerUserId: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    profile: Record<string, unknown>;
  }) => Promise<{
    id: string;
    email: string;
    name: string | null;
  }>;
  createAppSession: (userId: string) => Promise<unknown>;
};

function getGoogleEmailDomain(email: string) {
  return email.split("@")[1]?.trim().toLowerCase() ?? "";
}

function assertAllowedGoogleUser(userInfo: GoogleUserInfo) {
  if (!userInfo.email_verified) {
    throw new AppError(
      "Google account email must be verified before signing in.",
      403,
      "GOOGLE_EMAIL_UNVERIFIED",
    );
  }

  const allowedDomains = getGoogleAllowedEmailDomains();
  const emailDomain = getGoogleEmailDomain(userInfo.email);

  if (!allowedDomains.includes(emailDomain)) {
    throw new AppError(
      "Only Gmail accounts are allowed to sign in.",
      403,
      "GOOGLE_EMAIL_NOT_ALLOWED",
    );
  }
}

export async function handleGoogleOAuthCallback(
  deps: CallbackDeps,
  input: {
    code?: string | null;
    state?: string | null;
    error?: string | null;
    errorDescription?: string | null;
  },
) {
  if (input.error) {
    await incrementMetric("oauth_callback_error", "google");
    throw new AppError(
      input.errorDescription ?? input.error,
      400,
      "GOOGLE_OAUTH_DENIED",
    );
  }

  if (!input.code || !input.state) {
    throw new AppError(
      "Missing required Google OAuth callback parameters.",
      400,
      "GOOGLE_OAUTH_INVALID_CALLBACK",
    );
  }

  const now = deps.now?.() ?? new Date();
  const claimedState = await deps.claimState(input.state, now);

  if (claimedState.status === "missing") {
    throw new AppError("Invalid Google OAuth state.", 400, "OAUTH_STATE");
  }

  if (claimedState.status === "consumed") {
    throw new AppError(
      "This Google OAuth state has already been used.",
      400,
      "OAUTH_STATE_CONSUMED",
    );
  }

  if (claimedState.status === "expired") {
    throw new AppError(
      "This Google OAuth state has expired.",
      400,
      "OAUTH_STATE_EXPIRED",
    );
  }

  if (claimedState.status !== "claimed") {
    throw new AppError("Invalid Google OAuth state.", 400, "OAUTH_STATE");
  }

  const tokenSet = await deps.exchangeCode(input.code);
  const userInfo = await deps.fetchUserInfo(tokenSet.accessToken);

  assertAllowedGoogleUser(userInfo);

  const user = await deps.upsertUserIdentity({
    providerUserId: userInfo.sub,
    email: userInfo.email,
    displayName: userInfo.name ?? null,
    avatarUrl: userInfo.picture ?? null,
    profile: userInfo,
  });

  await deps.createAppSession(user.id);

  return {
    redirectTo: claimedState.state.redirectTo ?? "/factoring-dashboard",
  };
}
