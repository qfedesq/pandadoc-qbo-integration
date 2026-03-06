import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { assertSecureTokenEncryptionConfiguration, env } from "@/lib/env";
import { assertServerRuntime } from "@/lib/security/server-runtime";

assertServerRuntime("lib/security/encryption");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  return Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");
}

export function encryptSecret(value: string) {
  assertSecureTokenEncryptionConfiguration();

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(encryptedValue: string) {
  assertSecureTokenEncryptionConfiguration();

  const [version, ivRaw, tagRaw, payloadRaw] = encryptedValue.split(":");

  if (version !== "v1" || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("Unsupported encrypted secret payload.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivRaw, "base64url"),
    {
      authTagLength: AUTH_TAG_LENGTH,
    },
  );

  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
