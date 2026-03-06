const RETRYABLE_IMPORT_STATUSES = new Set([
  "document.error",
  "document.creation_failed",
  "document.deleted",
  "import.error",
]);

export function isRetryablePandaDocDocumentStatus(status?: string | null) {
  return Boolean(status && RETRYABLE_IMPORT_STATUSES.has(status));
}

export function humanizePandaDocDocumentStatus(status?: string | null) {
  if (!status) {
    return "Not imported";
  }

  return status.replace(/^document\./, "").replace(/\./g, " ").replace(/_/g, " ");
}
