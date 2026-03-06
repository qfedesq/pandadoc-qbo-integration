import {
  CapitalSourceType,
  OnChainExecutionStatus,
  SettlementMethod,
} from "@prisma/client";

import { env } from "@/lib/env";
import { getSettlementMethodDetail } from "@/lib/factoring/offers";
import { DEFAULT_CAPITAL_SOURCE_KEY } from "@/lib/factoring/marketplace";
import { createOpaqueToken } from "@/lib/security/hash";

export type ArenaSettlementRequest = {
  importedInvoiceId: string;
  transactionReference: string;
  settlementMethod: SettlementMethod;
  netProceeds: number;
  destinationMasked: string;
};

export type ArenaSettlementPreparation = {
  capitalSourceKey: string;
  capitalSourceType: CapitalSourceType;
  network: string;
  operatorWallet: string;
  settlementReference: string;
  onChainExecutionStatus: OnChainExecutionStatus;
  message: string;
};

export function createArenaStafiGateway() {
  return {
    prepareSettlement(
      input: ArenaSettlementRequest,
    ): ArenaSettlementPreparation {
      const method = getSettlementMethodDetail(input.settlementMethod);

      return {
        capitalSourceKey: DEFAULT_CAPITAL_SOURCE_KEY,
        capitalSourceType: CapitalSourceType.ARENA_STAFI_MANAGED_POOL,
        network: env.ARENA_STAFI_NETWORK,
        operatorWallet: env.ARENA_STAFI_OPERATOR_WALLET,
        settlementReference: `arena_sim_${createOpaqueToken(10)}`,
        onChainExecutionStatus: OnChainExecutionStatus.SIMULATED,
        message: `Prepared ${method.label.toLowerCase()} settlement for ${input.destinationMasked} through the managed Arena StaFi pool.`,
      };
    },
  };
}

export const arenaStafiGateway = createArenaStafiGateway();
