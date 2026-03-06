"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { isRetryablePandaDocDocumentStatus } from "@/lib/pandadoc/document-status";

export function ImportToPandaDocButton({
  importedInvoiceId,
  documentStatus,
  disabledReason,
}: {
  importedInvoiceId: string;
  documentStatus?: string | null;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const retryable = isRetryablePandaDocDocumentStatus(documentStatus);
  const alreadyImported = Boolean(documentStatus) && !retryable;

  function handleImport() {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/pandadoc/import-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          importedInvoiceId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            created?: boolean;
            sendRequested?: boolean;
            sendInitiated?: boolean;
          }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "Unable to import the invoice into PandaDoc.");
        return;
      }

      if (payload?.created) {
        setMessage(
          payload.sendRequested
            ? payload.sendInitiated
              ? "Document imported and sent via PandaDoc."
              : "Document imported. PandaDoc will send it when the draft is ready."
            : "Document imported into PandaDoc.",
        );
      } else {
        setMessage("This invoice is already linked to PandaDoc.");
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleImport}
        disabled={isPending || Boolean(disabledReason) || alreadyImported}
        size="sm"
        type="button"
        variant={retryable ? "secondary" : "outline"}
      >
        {isPending
          ? "Importing..."
          : retryable
            ? "Retry import"
            : alreadyImported
              ? "Imported"
              : "Import to PandaDoc"}
      </Button>
      {disabledReason ? (
        <p className="max-w-48 text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {message ? <p className="max-w-48 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
