type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };

const REDACT_KEYS = /authorization|cookie|secret|token|password/i;

function sanitize(value: unknown): Serializable {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        REDACT_KEYS.test(key) ? "[REDACTED]" : sanitize(entry),
      ]),
    );
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return value as Serializable;
}

function write(level: "info" | "warn" | "error", event: string, data?: unknown) {
  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(data ? { data: sanitize(data) } : {}),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export const logger = {
  info(event: string, data?: unknown) {
    write("info", event, data);
  },
  warn(event: string, data?: unknown) {
    write("warn", event, data);
  },
  error(event: string, data?: unknown) {
    write("error", event, data);
  },
};
