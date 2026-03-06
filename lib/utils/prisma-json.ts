import { Prisma } from "@prisma/client";

type PrismaInputJsonPropertyValue = Prisma.InputJsonValue | null;

function toInputJsonPropertyValue(
  value: unknown,
): PrismaInputJsonPropertyValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toInputJsonPropertyValue(entry));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        toInputJsonPropertyValue(entry),
      ]),
    );
  }

  return String(value);
}

export function toPrismaInputJsonObject(value: unknown): Prisma.InputJsonObject {
  const converted = toPrismaInputJsonValue(value);

  if (!converted || Array.isArray(converted) || typeof converted !== "object") {
    throw new TypeError("Expected an object-shaped JSON payload.");
  }

  return converted as Prisma.InputJsonObject;
}

export function toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue {
  const converted = toInputJsonPropertyValue(value);

  if (converted === null) {
    return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  }

  return converted as Prisma.InputJsonValue;
}
