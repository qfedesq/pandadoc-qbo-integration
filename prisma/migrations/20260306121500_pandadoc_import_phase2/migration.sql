ALTER TABLE "ImportedInvoice"
  ADD COLUMN "counterpartyEmail" TEXT;

ALTER TABLE "DocumentInvoiceLink"
  ADD COLUMN "documentName" TEXT,
  ADD COLUMN "autoSend" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

CREATE UNIQUE INDEX "DocumentInvoiceLink_userId_importedInvoiceId_key"
  ON "DocumentInvoiceLink"("userId", "importedInvoiceId");
