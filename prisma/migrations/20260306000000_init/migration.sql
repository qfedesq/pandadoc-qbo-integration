CREATE TYPE "Provider" AS ENUM ('PANDADOC', 'QUICKBOOKS');
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'DISCONNECTED');
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'OVERDUE', 'OPEN', 'PARTIALLY_PAID');
CREATE TYPE "SyncTrigger" AS ENUM ('USER', 'CRON', 'SYSTEM');
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
CREATE TYPE "SyncDirection" AS ENUM ('PULL', 'PUSH', 'BIDIRECTIONAL');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "Provider" NOT NULL,
  "state" TEXT NOT NULL,
  "redirectTo" TEXT,
  "codeVerifier" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "Provider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "displayName" TEXT,
  "externalAccountId" TEXT,
  "externalAccountName" TEXT,
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthToken" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "tokenType" TEXT NOT NULL,
  "scope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuickBooksCompany" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "realmId" TEXT NOT NULL,
  "companyName" TEXT,
  "country" TEXT,
  "currency" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuickBooksCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportedInvoice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "quickBooksCompanyId" TEXT,
  "provider" "Provider" NOT NULL,
  "providerInvoiceId" TEXT NOT NULL,
  "docNumber" TEXT,
  "totalAmount" DECIMAL(18, 2) NOT NULL,
  "balanceAmount" DECIMAL(18, 2) NOT NULL,
  "currency" TEXT,
  "dueDate" TIMESTAMP(3),
  "issueDate" TIMESTAMP(3),
  "txnDate" TIMESTAMP(3),
  "createdTime" TIMESTAMP(3),
  "updatedTime" TIMESTAMP(3),
  "counterpartyName" TEXT NOT NULL,
  "normalizedStatus" "InvoiceStatus" NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportedInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEventLog" (
  "id" TEXT NOT NULL,
  "provider" "Provider" NOT NULL,
  "userId" TEXT,
  "connectionId" TEXT,
  "externalEventId" TEXT,
  "eventType" TEXT,
  "signatureValidated" BOOLEAN,
  "deliveryKey" TEXT,
  "payloadHash" TEXT NOT NULL,
  "headers" JSONB NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEventLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "connectionId" TEXT,
  "provider" "Provider" NOT NULL,
  "trigger" "SyncTrigger" NOT NULL,
  "status" "SyncRunStatus" NOT NULL,
  "fetchedCount" INTEGER NOT NULL DEFAULT 0,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "upsertedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "cursor" TEXT,
  "errorMessage" TEXT,
  "metrics" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetricCounter" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MetricCounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
  "id" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "bucketStart" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentInvoiceLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "importedInvoiceId" TEXT NOT NULL,
  "pandadocConnectionId" TEXT,
  "pandadocDocumentId" TEXT NOT NULL,
  "pandadocDocumentStatus" TEXT,
  "syncDirection" "SyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentInvoiceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "AppSession_sessionTokenHash_key" ON "AppSession"("sessionTokenHash");
CREATE INDEX "AppSession_userId_idx" ON "AppSession"("userId");
CREATE INDEX "AppSession_expiresAt_idx" ON "AppSession"("expiresAt");

CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");
CREATE INDEX "OAuthState_userId_provider_idx" ON "OAuthState"("userId", "provider");
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");

CREATE UNIQUE INDEX "IntegrationConnection_userId_provider_key" ON "IntegrationConnection"("userId", "provider");
CREATE INDEX "IntegrationConnection_provider_status_idx" ON "IntegrationConnection"("provider", "status");

CREATE UNIQUE INDEX "OAuthToken_connectionId_key" ON "OAuthToken"("connectionId");
CREATE INDEX "OAuthToken_accessTokenExpiresAt_idx" ON "OAuthToken"("accessTokenExpiresAt");

CREATE UNIQUE INDEX "QuickBooksCompany_connectionId_key" ON "QuickBooksCompany"("connectionId");
CREATE UNIQUE INDEX "QuickBooksCompany_realmId_key" ON "QuickBooksCompany"("realmId");

CREATE UNIQUE INDEX "ImportedInvoice_connectionId_providerInvoiceId_key" ON "ImportedInvoice"("connectionId", "providerInvoiceId");
CREATE INDEX "ImportedInvoice_userId_normalizedStatus_idx" ON "ImportedInvoice"("userId", "normalizedStatus");
CREATE INDEX "ImportedInvoice_connectionId_lastSyncedAt_idx" ON "ImportedInvoice"("connectionId", "lastSyncedAt");
CREATE INDEX "ImportedInvoice_counterpartyName_idx" ON "ImportedInvoice"("counterpartyName");

CREATE UNIQUE INDEX "WebhookEventLog_provider_payloadHash_key" ON "WebhookEventLog"("provider", "payloadHash");
CREATE INDEX "WebhookEventLog_provider_createdAt_idx" ON "WebhookEventLog"("provider", "createdAt");

CREATE INDEX "SyncRun_provider_startedAt_idx" ON "SyncRun"("provider", "startedAt");

CREATE UNIQUE INDEX "MetricCounter_name_scope_key" ON "MetricCounter"("name", "scope");
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_bucketStart_key" ON "RateLimitBucket"("keyHash", "bucketStart");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

CREATE UNIQUE INDEX "DocumentInvoiceLink_userId_pandadocDocumentId_key" ON "DocumentInvoiceLink"("userId", "pandadocDocumentId");

ALTER TABLE "AppSession"
  ADD CONSTRAINT "AppSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthState"
  ADD CONSTRAINT "OAuthState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationConnection"
  ADD CONSTRAINT "IntegrationConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthToken"
  ADD CONSTRAINT "OAuthToken_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuickBooksCompany"
  ADD CONSTRAINT "QuickBooksCompany_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportedInvoice"
  ADD CONSTRAINT "ImportedInvoice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportedInvoice"
  ADD CONSTRAINT "ImportedInvoice_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportedInvoice"
  ADD CONSTRAINT "ImportedInvoice_quickBooksCompanyId_fkey"
  FOREIGN KEY ("quickBooksCompanyId") REFERENCES "QuickBooksCompany"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WebhookEventLog"
  ADD CONSTRAINT "WebhookEventLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WebhookEventLog"
  ADD CONSTRAINT "WebhookEventLog_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SyncRun"
  ADD CONSTRAINT "SyncRun_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SyncRun"
  ADD CONSTRAINT "SyncRun_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentInvoiceLink"
  ADD CONSTRAINT "DocumentInvoiceLink_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentInvoiceLink"
  ADD CONSTRAINT "DocumentInvoiceLink_importedInvoiceId_fkey"
  FOREIGN KEY ("importedInvoiceId") REFERENCES "ImportedInvoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentInvoiceLink"
  ADD CONSTRAINT "DocumentInvoiceLink_pandadocConnectionId_fkey"
  FOREIGN KEY ("pandadocConnectionId") REFERENCES "IntegrationConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
