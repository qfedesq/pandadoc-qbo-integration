import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";

function getExpectedOrigins(request: Request) {
  const origins = new Set<string>();

  origins.add(new URL(env.APP_BASE_URL).origin);

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // Ignore malformed request URLs and fall back to APP_BASE_URL only.
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    origins.add(`${forwardedProto}://${forwardedHost}`);
  }

  return [...origins];
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isEquivalentOrigin(source: URL, expected: URL) {
  if (source.origin === expected.origin) {
    return true;
  }

  return (
    source.protocol === expected.protocol &&
    source.port === expected.port &&
    isLoopbackHostname(source.hostname) &&
    isLoopbackHostname(expected.hostname)
  );
}

export function assertValidAppRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin ?? referer;

  if (!source) {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    throw new AppError(
      "Request origin validation failed.",
      403,
      "INVALID_ORIGIN",
    );
  }

  let sourceUrl: URL;
  const expectedOrigins = getExpectedOrigins(request);

  try {
    sourceUrl = new URL(source);
  } catch {
    throw new AppError(
      "Request origin validation failed.",
      403,
      "INVALID_ORIGIN",
    );
  }

  const originMatches = expectedOrigins.some((expectedOrigin) =>
    isEquivalentOrigin(sourceUrl, new URL(expectedOrigin)),
  );

  if (!originMatches) {
    throw new AppError(
      "Request origin validation failed.",
      403,
      "INVALID_ORIGIN",
    );
  }
}
