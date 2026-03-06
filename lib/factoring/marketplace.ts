import { AccountingSystem, MarketplaceNode, Provider } from "@prisma/client";

import { AppError } from "@/lib/utils/errors";

export const DEFAULT_MARKETPLACE_NODE = MarketplaceNode.PANDADOC;
export const DEFAULT_CAPITAL_SOURCE_KEY = "arena-stafi-managed-pool";

export function getAccountingSystemForProvider(provider: Provider) {
  switch (provider) {
    case Provider.QUICKBOOKS:
      return AccountingSystem.QUICKBOOKS;
    default:
      throw new AppError(
        `Unsupported accounting provider for factoring: ${provider}.`,
        400,
        "UNSUPPORTED_ACCOUNTING_PROVIDER",
      );
  }
}
