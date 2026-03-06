import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";

function getExpectedOrigin() {
  return new URL(env.APP_BASE_URL).origin;
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
  const expectedUrl = new URL(getExpectedOrigin());

  try {
    sourceUrl = new URL(source);
  } catch {
    throw new AppError(
      "Request origin validation failed.",
      403,
      "INVALID_ORIGIN",
    );
  }

  if (!isEquivalentOrigin(sourceUrl, expectedUrl)) {
    throw new AppError(
      "Request origin validation failed.",
      403,
      "INVALID_ORIGIN",
    );
  }
}
