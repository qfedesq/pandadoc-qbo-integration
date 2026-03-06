import {
  InvoiceStatus,
  SettlementMethod,
  type CapitalSource,
} from "@prisma/client";

import { env } from "@/lib/env";
import { evaluateFactoringEligibility } from "@/lib/factoring/eligibility";
import { formatCurrency, toDateOnly } from "@/lib/utils";

type Decimalish = number | string | { toString(): string };

export type OfferInvoiceInput = {
  importedInvoiceId: string;
  providerInvoiceId: string;
  docNumber?: string | null;
  counterpartyName: string;
  normalizedStatus: InvoiceStatus;
  balanceAmount: Decimalish;
  totalAmount: Decimalish;
  currency?: string | null;
  dueDate?: Date | null;
  issueDate?: Date | null;
  transactions?: Array<{
    status: import("@prisma/client").FactoringTransactionStatus;
  }>;
};

export type SettlementMethodOption = {
  method: SettlementMethod;
  label: string;
  description: string;
  settlementTimeLabel: string;
  helperText: string;
};

export type CalculatedFactoringOffer = {
  eligibility: ReturnType<typeof evaluateFactoringEligibility>;
  grossAmount: number;
  discountRateBps: number;
  discountAmount: number;
  netProceeds: number;
  settlementCurrency: string;
  settlementTimeSummary: string;
  settlementOptions: SettlementMethodOption[];
  termsSnapshot: {
    invoice: {
      importedInvoiceId: string;
      providerInvoiceId: string;
      docNumber: string | null;
      counterpartyName: string;
      dueDate: string | null;
      issueDate: string | null;
      invoiceStatus: InvoiceStatus;
    };
    economics: {
      grossAmount: number;
      discountRateBps: number;
      discountAmount: number;
      netProceeds: number;
      settlementCurrency: string;
    };
    capitalSource: {
      id: string;
      key: string;
      name: string;
      network: string;
      currency: string;
    };
    settlementOptions: SettlementMethodOption[];
    notes: string[];
  };
};

const settlementMethodDetails: Record<SettlementMethod, SettlementMethodOption> = {
  USDC_WALLET: {
    method: SettlementMethod.USDC_WALLET,
    label: "USDC wallet",
    description: "Receive settlement from the managed Arena StaFi pool in USDC.",
    settlementTimeLabel: "Within minutes",
    helperText: "Provide the wallet address that should receive USDC.",
  },
  ACH: {
    method: SettlementMethod.ACH,
    label: "ACH",
    description: "Use the operator-managed off-ramp for same-day ACH settlement.",
    settlementTimeLabel: "Same business day",
    helperText: "Provide a bank account label or the last four digits for confirmation.",
  },
  DEBIT_CARD: {
    method: SettlementMethod.DEBIT_CARD,
    label: "Debit card",
    description: "Route settlement to a card rail managed by the operator wallet.",
    settlementTimeLabel: "Within 30 minutes",
    helperText: "Provide the last four digits of the debit card for the demo flow.",
  },
};

function toNumber(value: Decimalish) {
  const numeric = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getDiscountRateBps(input: OfferInvoiceInput, now: Date) {
  let basisPoints =
    input.normalizedStatus === InvoiceStatus.PARTIALLY_PAID
      ? env.FACTORING_PARTIAL_PAYMENT_DISCOUNT_BPS
      : env.FACTORING_BASE_DISCOUNT_BPS;

  if (input.dueDate) {
    const dueDateOnly = toDateOnly(input.dueDate);
    const nowDateOnly = toDateOnly(now);
    const daysUntilDue = Math.ceil(
      (dueDateOnly.getTime() - nowDateOnly.getTime()) / 86_400_000,
    );

    if (daysUntilDue <= 14) {
      basisPoints -= 50;
    } else if (daysUntilDue >= 45) {
      basisPoints += 75;
    }
  }

  return Math.min(Math.max(basisPoints, 200), 900);
}

export function getSettlementMethodOptions() {
  return Object.values(settlementMethodDetails);
}

export function getSettlementMethodDetail(method: SettlementMethod) {
  return settlementMethodDetails[method];
}

export function formatDiscountRate(discountRateBps: number) {
  return `${(discountRateBps / 100).toFixed(2)}%`;
}

export function calculateFactoringOffer(
  input: OfferInvoiceInput,
  capitalSource: Pick<CapitalSource, "id" | "key" | "name" | "network" | "currency">,
  now = new Date(),
): CalculatedFactoringOffer {
  const eligibility = evaluateFactoringEligibility(input);
  const grossAmount = roundCurrency(toNumber(input.balanceAmount));
  const discountRateBps = getDiscountRateBps(input, now);
  const discountAmount = roundCurrency(grossAmount * (discountRateBps / 10_000));
  const netProceeds = roundCurrency(Math.max(grossAmount - discountAmount, 0));
  const settlementOptions = getSettlementMethodOptions();
  const settlementTimeSummary = settlementOptions
    .map((option) => `${option.label}: ${option.settlementTimeLabel}`)
    .join(" / ");

  const finalEligibility =
    netProceeds < env.FACTORING_MIN_NET_PROCEEDS
      ? {
          ...eligibility,
          eligible: false,
          status: eligibility.status,
          reason:
            "Net proceeds fall below the minimum threshold for the managed pool.",
        }
      : eligibility;

  return {
    eligibility: finalEligibility,
    grossAmount,
    discountRateBps,
    discountAmount,
    netProceeds,
    settlementCurrency: capitalSource.currency,
    settlementTimeSummary,
    settlementOptions,
    termsSnapshot: {
      invoice: {
        importedInvoiceId: input.importedInvoiceId,
        providerInvoiceId: input.providerInvoiceId,
        docNumber: input.docNumber ?? null,
        counterpartyName: input.counterpartyName,
        dueDate: input.dueDate?.toISOString() ?? null,
        issueDate: input.issueDate?.toISOString() ?? null,
        invoiceStatus: input.normalizedStatus,
      },
      economics: {
        grossAmount,
        discountRateBps,
        discountAmount,
        netProceeds,
        settlementCurrency: capitalSource.currency,
      },
      capitalSource: {
        id: capitalSource.id,
        key: capitalSource.key,
        name: capitalSource.name,
        network: capitalSource.network,
        currency: capitalSource.currency,
      },
      settlementOptions,
      notes: [
        `${formatCurrency(grossAmount, input.currency ?? "USD")} outstanding balance under evaluation.`,
        `Indicative discount rate: ${formatDiscountRate(discountRateBps)}.`,
        "Tier 1 settlement is operator-managed and Arena StaFi-ready, but on-chain execution remains simulated in this MVP.",
      ],
    },
  };
}
