import { z } from "zod";

import { assertServerRuntime } from "@/lib/security/server-runtime";

assertServerRuntime("lib/env");

const defaultTokenKey =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const defaultCronSecret = "replace-with-a-long-random-string";
const defaultAdminPassword = "ChangeMe123!";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/pandadoc_qbo?schema=public"),
  DEFAULT_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default(defaultAdminPassword),
  SEED_DEMO_DATA: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true")
    .default(false),
  SESSION_COOKIE_NAME: z.string().min(1).default("pandadoc_qbo_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 7),
  OUTBOUND_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  INVOICE_SYNC_ENABLED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) =>
      value === undefined ? true : value === true || value === "true",
    )
    .default(true),
  INVOICE_SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/)
    .default(defaultTokenKey),
  INTERNAL_SYNC_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).default(defaultCronSecret),
  PANDADOC_CLIENT_ID: z.string().optional().default(""),
  PANDADOC_CLIENT_SECRET: z.string().optional().default(""),
  PANDADOC_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3000/api/oauth/pandadoc/callback"),
  PANDADOC_SCOPES: z.string().default("read+write"),
  PANDADOC_AUTH_URL: z
    .string()
    .url()
    .default("https://app.pandadoc.com/oauth2/authorize"),
  PANDADOC_TOKEN_URL: z
    .string()
    .url()
    .default("https://api.pandadoc.com/oauth2/access_token"),
  PANDADOC_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.pandadoc.com"),
  PANDADOC_TEMPLATE_UUID: z.string().optional().default(""),
  PANDADOC_RECIPIENT_ROLE: z.string().min(1).default("Client"),
  PANDADOC_DOCUMENT_NAME_PREFIX: z.string().min(1).default("Invoice"),
  PANDADOC_SEND_ON_IMPORT: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true")
    .default(false),
  PANDADOC_WEBHOOK_SHARED_SECRET: z.string().optional().default(""),
  QUICKBOOKS_CLIENT_ID: z.string().optional().default(""),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional().default(""),
  QUICKBOOKS_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3000/api/oauth/quickbooks/callback"),
  QUICKBOOKS_SCOPES: z.string().default("com.intuit.quickbooks.accounting"),
  QUICKBOOKS_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  QUICKBOOKS_AUTH_URL: z
    .string()
    .url()
    .default("https://appcenter.intuit.com/connect/oauth2"),
  QUICKBOOKS_TOKEN_URL: z
    .string()
    .url()
    .default("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"),
  QUICKBOOKS_MINOR_VERSION: z.coerce.number().int().positive().default(75),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  INTERNAL_SYNC_SECRET: parsedEnv.INTERNAL_SYNC_SECRET ?? parsedEnv.CRON_SECRET,
};

export const isProduction = env.NODE_ENV === "production";

export function hasPandaDocOauthConfig() {
  return Boolean(env.PANDADOC_CLIENT_ID && env.PANDADOC_CLIENT_SECRET);
}

export function hasPandaDocImportConfig() {
  return Boolean(hasPandaDocOauthConfig() && env.PANDADOC_TEMPLATE_UUID);
}

export function hasQuickBooksOauthConfig() {
  return Boolean(env.QUICKBOOKS_CLIENT_ID && env.QUICKBOOKS_CLIENT_SECRET);
}

export function assertSecureTokenEncryptionConfiguration() {
  if (env.NODE_ENV === "production" && env.TOKEN_ENCRYPTION_KEY === defaultTokenKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be explicitly set in production.",
    );
  }
}

export function assertSecureCronConfiguration() {
  if (
    env.NODE_ENV === "production" &&
    env.INTERNAL_SYNC_SECRET === defaultCronSecret
  ) {
    throw new Error(
      "INTERNAL_SYNC_SECRET or CRON_SECRET must be explicitly set in production.",
    );
  }
}

export function assertSecureAdminConfiguration() {
  if (
    env.NODE_ENV === "production" &&
    env.DEFAULT_ADMIN_PASSWORD === defaultAdminPassword
  ) {
    throw new Error("DEFAULT_ADMIN_PASSWORD must be rotated in production.");
  }
}
