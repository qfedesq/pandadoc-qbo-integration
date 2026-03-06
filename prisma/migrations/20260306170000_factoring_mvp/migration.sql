CREATE TYPE "MarketplaceNode" AS ENUM ('PANDADOC');
CREATE TYPE "AccountingSystem" AS ENUM ('QUICKBOOKS');
CREATE TYPE "FactoringEligibilityStatus" AS ENUM ('ELIGIBLE', 'INELIGIBLE');
CREATE TYPE "SettlementMethod" AS ENUM ('USDC_WALLET', 'ACH', 'DEBIT_CARD');
CREATE TYPE "FactoringTransactionStatus" AS ENUM ('PENDING', 'FUNDED', 'REPAID', 'CANCELLED');
CREATE TYPE "CapitalSourceType" AS ENUM ('ARENA_STAFI_MANAGED_POOL');
CREATE TYPE "OnChainExecutionStatus" AS ENUM ('NOT_STARTED', 'SIMULATED', 'SETTLED');
CREATE TYPE "FactoringEventType" AS ENUM (
  'OFFER_GENERATED',
  'TERMS_ACCEPTED',
  'TRANSACTION_CREATED',
  'ARENA_SETTLEMENT_PREPARED',
  'STATUS_CHANGED',
  'REPAYMENT_RECORDED'
);

CREATE TABLE "CapitalSource" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "marketplaceNode" "MarketplaceNode" NOT NULL,
  "type" "CapitalSourceType" NOT NULL,
  "network" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "operatorWallet" TEXT,
  "liquiditySnapshot" DECIMAL(18,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CapitalSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactoringOffer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "importedInvoiceId" TEXT NOT NULL,
  "capitalSourceId" TEXT NOT NULL,
  "marketplaceNode" "MarketplaceNode" NOT NULL,
  "accountingSystem" "AccountingSystem" NOT NULL,
  "eligibilityStatus" "FactoringEligibilityStatus" NOT NULL,
  "ineligibilityReason" TEXT,
  "grossAmount" DECIMAL(18,2) NOT NULL,
  "discountRateBps" INTEGER NOT NULL,
  "discountAmount" DECIMAL(18,2) NOT NULL,
  "netProceeds" DECIMAL(18,2) NOT NULL,
  "settlementCurrency" TEXT NOT NULL,
  "settlementTimeSummary" TEXT NOT NULL,
  "termsSnapshot" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FactoringOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactoringTransaction" (
  "id" TEXT NOT NULL,
  "transactionReference" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "importedInvoiceId" TEXT NOT NULL,
  "factoringOfferId" TEXT,
  "capitalSourceId" TEXT NOT NULL,
  "marketplaceNode" "MarketplaceNode" NOT NULL,
  "accountingSystem" "AccountingSystem" NOT NULL,
  "status" "FactoringTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "settlementMethod" "SettlementMethod" NOT NULL,
  "settlementDestinationMasked" TEXT NOT NULL,
  "sellerWalletAddress" TEXT,
  "invoiceCurrency" TEXT,
  "settlementCurrency" TEXT NOT NULL,
  "grossAmount" DECIMAL(18,2) NOT NULL,
  "discountRateBps" INTEGER NOT NULL,
  "discountAmount" DECIMAL(18,2) NOT NULL,
  "netProceeds" DECIMAL(18,2) NOT NULL,
  "settlementTimeLabel" TEXT NOT NULL,
  "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
  "fundedAt" TIMESTAMP(3),
  "repaidAt" TIMESTAMP(3),
  "operatorWallet" TEXT,
  "arenaSettlementReference" TEXT,
  "onChainExecutionStatus" "OnChainExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FactoringTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactoringEventLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "importedInvoiceId" TEXT NOT NULL,
  "factoringTransactionId" TEXT,
  "eventType" "FactoringEventType" NOT NULL,
  "statusFrom" "FactoringTransactionStatus",
  "statusTo" "FactoringTransactionStatus",
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FactoringEventLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CapitalSource_key_key" ON "CapitalSource"("key");
CREATE INDEX "CapitalSource_marketplaceNode_type_isActive_idx"
  ON "CapitalSource"("marketplaceNode", "type", "isActive");

CREATE UNIQUE INDEX "FactoringOffer_importedInvoiceId_key" ON "FactoringOffer"("importedInvoiceId");
CREATE INDEX "FactoringOffer_userId_eligibilityStatus_idx"
  ON "FactoringOffer"("userId", "eligibilityStatus");

CREATE UNIQUE INDEX "FactoringTransaction_transactionReference_key"
  ON "FactoringTransaction"("transactionReference");
CREATE INDEX "FactoringTransaction_userId_status_createdAt_idx"
  ON "FactoringTransaction"("userId", "status", "createdAt");
CREATE INDEX "FactoringTransaction_importedInvoiceId_status_idx"
  ON "FactoringTransaction"("importedInvoiceId", "status");

CREATE INDEX "FactoringEventLog_userId_createdAt_idx"
  ON "FactoringEventLog"("userId", "createdAt");
CREATE INDEX "FactoringEventLog_factoringTransactionId_createdAt_idx"
  ON "FactoringEventLog"("factoringTransactionId", "createdAt");

ALTER TABLE "FactoringOffer"
  ADD CONSTRAINT "FactoringOffer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactoringOffer"
  ADD CONSTRAINT "FactoringOffer_importedInvoiceId_fkey"
  FOREIGN KEY ("importedInvoiceId") REFERENCES "ImportedInvoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactoringOffer"
  ADD CONSTRAINT "FactoringOffer_capitalSourceId_fkey"
  FOREIGN KEY ("capitalSourceId") REFERENCES "CapitalSource"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FactoringTransaction"
  ADD CONSTRAINT "FactoringTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactoringTransaction"
  ADD CONSTRAINT "FactoringTransaction_importedInvoiceId_fkey"
  FOREIGN KEY ("importedInvoiceId") REFERENCES "ImportedInvoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactoringTransaction"
  ADD CONSTRAINT "FactoringTransaction_factoringOfferId_fkey"
  FOREIGN KEY ("factoringOfferId") REFERENCES "FactoringOffer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FactoringTransaction"
  ADD CONSTRAINT "FactoringTransaction_capitalSourceId_fkey"
  FOREIGN KEY ("capitalSourceId") REFERENCES "CapitalSource"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FactoringEventLog"
  ADD CONSTRAINT "FactoringEventLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactoringEventLog"
  ADD CONSTRAINT "FactoringEventLog_importedInvoiceId_fkey"
  FOREIGN KEY ("importedInvoiceId") REFERENCES "ImportedInvoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FactoringEventLog"
  ADD CONSTRAINT "FactoringEventLog_factoringTransactionId_fkey"
  FOREIGN KEY ("factoringTransactionId") REFERENCES "FactoringTransaction"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
