import { Badge } from "@/components/ui/badge";
import { humanizePandaDocDocumentStatus } from "@/lib/pandadoc/document-status";

function getVariant(status?: string | null) {
  if (!status) {
    return "muted" as const;
  }

  if (status === "document.sent" || status === "document.completed") {
    return "success" as const;
  }

  if (
    status === "document.creation_failed" ||
    status === "document.error" ||
    status === "import.error"
  ) {
    return "destructive" as const;
  }

  if (status === "document.viewed" || status === "document.draft") {
    return "warning" as const;
  }

  return "default" as const;
}

export function PandaDocStatusBadge({ status }: { status?: string | null }) {
  return (
    <Badge variant={getVariant(status)}>
      {humanizePandaDocDocumentStatus(status)}
    </Badge>
  );
}
