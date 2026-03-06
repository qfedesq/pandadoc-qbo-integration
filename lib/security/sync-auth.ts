import { assertSecureCronConfiguration, env } from "@/lib/env";

type SyncRequestAuthMode = "any" | "vercel-cron";

function getExpectedBearerTokens(mode: SyncRequestAuthMode) {
  if (mode === "vercel-cron") {
    assertSecureCronConfiguration({ requireVercelCronSecret: true });
    return [`Bearer ${env.CRON_SECRET}`];
  }

  assertSecureCronConfiguration();

  const tokens = new Set<string>();
  tokens.add(`Bearer ${env.INTERNAL_SYNC_SECRET}`);
  tokens.add(`Bearer ${env.CRON_SECRET}`);
  return [...tokens];
}

export function isAuthorizedSyncRequest(
  request: Request,
  mode: SyncRequestAuthMode = "any",
) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  return getExpectedBearerTokens(mode).includes(authHeader);
}
