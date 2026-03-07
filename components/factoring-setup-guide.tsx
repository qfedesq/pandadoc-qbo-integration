import { Provider, type IntegrationConnection } from "@prisma/client";

import { CsrfHiddenInput } from "@/components/csrf-hidden-input";
import { SyncButton } from "@/components/sync-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isQuickBooksMockMode } from "@/lib/env";
import { getQuickBooksConnectionDisplayName } from "@/lib/providers/quickbooks/mock";

function ProviderConnectAction({
  provider,
  configured,
  redirectTo,
  connected,
}: {
  provider: Provider;
  configured: boolean;
  redirectTo: string;
  connected: boolean;
}) {
  const action =
    provider === Provider.PANDADOC
      ? "/api/oauth/pandadoc/connect"
      : "/api/oauth/quickbooks/connect";
  const label =
    provider === Provider.PANDADOC
      ? "workspace"
      : isQuickBooksMockMode()
        ? "demo company"
        : "company";
  const providerLabel =
    provider === Provider.PANDADOC ? "PandaDoc" : "QuickBooks";

  if (!configured) {
    return (
      <Button type="button" variant="outline" disabled>
        {providerLabel} credentials pending
      </Button>
    );
  }

  return (
    <form action={action} method="post">
      <CsrfHiddenInput />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" variant={connected ? "secondary" : "default"}>
        {connected ? `Reconnect ${label}` : `Connect ${label}`}
      </Button>
    </form>
  );
}

function SetupStep({
  step,
  title,
  description,
  status,
  action,
  detail,
}: {
  step: string;
  title: string;
  description: string;
  status: "CONNECTED" | "DISCONNECTED";
  action: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-[1rem] border border-border/80 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {step}
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-sm text-foreground/85">{detail}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

export function FactoringSetupGuide({
  pandaDocConnection,
  quickBooksConnection,
  pandaDocConfigured,
  quickBooksConfigured,
  providerMessages,
}: {
  pandaDocConnection: IntegrationConnection | null;
  quickBooksConnection: IntegrationConnection | null;
  pandaDocConfigured: boolean;
  quickBooksConfigured: boolean;
  providerMessages: {
    pandaDoc: string;
    quickBooks: string;
  };
}) {
  const pandaDocConnected = pandaDocConnection?.status === "CONNECTED";
  const quickBooksConnected = quickBooksConnection?.status === "CONNECTED";
  const quickBooksAccountName =
    getQuickBooksConnectionDisplayName(quickBooksConnection);
  const bridgeReady = pandaDocConnected && quickBooksConnected;
  const redirectTo = "/factoring-dashboard";

  if (bridgeReady) {
    return (
      <Card className="border-border/80">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Setup complete
            </p>
            <CardTitle>Workspace ready for invoice-based funding</CardTitle>
            <p className="max-w-3xl text-sm text-muted-foreground">
              PandaDoc and QuickBooks are connected. The dashboard can stay
              focused on invoices and withdrawals, while integration detail
              stays under the dedicated settings view.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
            Ready to import, price, and fund invoices
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1rem] border border-border/80 bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              PandaDoc
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {pandaDocConnection?.externalAccountName ?? "Workspace connected"}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/80 bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              QuickBooks
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {quickBooksAccountName ?? "Company connected"}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/80 bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Next step
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Sync invoices and focus on `Withdraw Capital` opportunities.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Setup
          </p>
          <CardTitle>Connect the workspace, then focus on invoices</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Only three actions are required before the seller flow is usable:
            connect PandaDoc, connect QuickBooks, and run the first invoice sync.
          </p>
        </div>
        <div className="rounded-lg border border-border/80 bg-background/50 px-4 py-2 text-sm font-medium text-foreground">
          Complete the remaining steps to unlock withdrawals
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <SetupStep
            step="Step 1"
            title="Connect PandaDoc workspace"
            description="Authorize the workspace where invoice documents and financing actions will live."
            status={pandaDocConnected ? "CONNECTED" : "DISCONNECTED"}
            detail={
              pandaDocConnected
                ? `Connected as ${pandaDocConnection?.externalAccountName ?? "PandaDoc workspace"}.`
                : providerMessages.pandaDoc
            }
            action={
              <ProviderConnectAction
                provider={Provider.PANDADOC}
                configured={pandaDocConfigured}
                redirectTo={redirectTo}
                connected={pandaDocConnected}
              />
            }
          />
          <SetupStep
            step="Step 2"
            title="Connect QuickBooks company"
            description="Authorize the accounting source of truth for open invoices and due dates."
            status={quickBooksConnected ? "CONNECTED" : "DISCONNECTED"}
            detail={
              quickBooksConnected
                ? `Connected as ${quickBooksAccountName ?? "QuickBooks company"}.`
                : providerMessages.quickBooks
            }
            action={
              <ProviderConnectAction
                provider={Provider.QUICKBOOKS}
                configured={quickBooksConfigured}
                redirectTo={redirectTo}
                connected={quickBooksConnected}
              />
            }
          />
          <SetupStep
            step="Step 3"
            title="Import invoices and surface offers"
            description="Refresh outstanding invoices and expose eligible `Withdraw Capital` actions."
            status={quickBooksConnected ? "CONNECTED" : "DISCONNECTED"}
            detail={
              quickBooksConnected
                ? "Run sync once to load invoices and surface funding opportunities."
                : "QuickBooks must be connected before invoice refresh can start."
            }
            action={
              <SyncButton
                disabled={!quickBooksConnected}
                payload={
                  quickBooksConnection
                    ? { connectionId: quickBooksConnection.id, force: true }
                    : undefined
                }
              />
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
