type CapitalPoolSummaryInput = {
  totalLiquidity?: number | string | { toString(): string } | null;
  availableLiquidity: number | string | { toString(): string } | null;
  deployedLiquidity: number | string | { toString(): string } | null;
  accruedYield: number | string | { toString(): string } | null;
  protocolFeesCollected: number | string | { toString(): string } | null;
};

function toNumber(
  value: number | string | { toString(): string } | null | undefined,
) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function toPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return roundCurrency((part / total) * 100);
}

export function summarizeCapitalPool(input: CapitalPoolSummaryInput) {
  const availableLiquidity = toNumber(input.availableLiquidity);
  const deployedLiquidity = toNumber(input.deployedLiquidity);
  const accruedYield = toNumber(input.accruedYield);
  const protocolFeesCollected = toNumber(input.protocolFeesCollected);
  const reportedTotalLiquidity = toNumber(input.totalLiquidity);
  const managedCapital = roundCurrency(availableLiquidity + deployedLiquidity);
  const deploymentRatio = toPercent(deployedLiquidity, managedCapital);
  const availableRatio = toPercent(availableLiquidity, managedCapital);
  const reportedLiquidityDrift = roundCurrency(
    reportedTotalLiquidity - managedCapital,
  );

  return {
    availableLiquidity,
    deployedLiquidity,
    accruedYield,
    protocolFeesCollected,
    managedCapital,
    deploymentRatio,
    availableRatio,
    reportedTotalLiquidity,
    reportedLiquidityDrift,
    hasReportedLiquidityDrift: Math.abs(reportedLiquidityDrift) > 0.01,
  };
}
