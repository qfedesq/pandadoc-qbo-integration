import { env } from "@/lib/env";

function extractMessageFromObject(payload: Record<string, unknown>) {
  const candidates = [
    payload.error_description,
    payload.error,
    payload.message,
    payload.detail,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const fault = payload.Fault ?? payload.fault;
  if (fault && typeof fault === "object") {
    const faultRecord = fault as Record<string, unknown>;
    const errorList = faultRecord.Error ?? faultRecord.error;

    if (Array.isArray(errorList)) {
      for (const item of errorList) {
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const message = record.Detail ?? record.Message ?? record.message;

          if (typeof message === "string" && message.trim().length > 0) {
            return message.trim();
          }
        }
      }
    }
  }

  return null;
}

export async function getHttpErrorDetails(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = await response.json();

      if (payload && typeof payload === "object") {
        return extractMessageFromObject(payload as Record<string, unknown>);
      }

      return null;
    }

    const text = (await response.text()).trim();
    return text.length > 0 ? text.slice(0, 300) : null;
  } catch {
    return null;
  }
}

export function getOutboundRequestSignal() {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(env.OUTBOUND_HTTP_TIMEOUT_MS);
  }

  return undefined;
}
