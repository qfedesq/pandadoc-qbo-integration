import { describe, expect, it } from "vitest";

import { summarizeCapitalPool } from "@/lib/factoring/capital-pool";

describe("summarizeCapitalPool", () => {
  it("derives managed capital from live liquidity buckets", () => {
    const summary = summarizeCapitalPool({
      totalLiquidity: "500224.25",
      availableLiquidity: "500804.75",
      deployedLiquidity: "0.00",
      accruedYield: "224.25",
      protocolFeesCollected: "22.75",
    });

    expect(summary.managedCapital).toBe(500804.75);
    expect(summary.availableRatio).toBe(100);
    expect(summary.deploymentRatio).toBe(0);
    expect(summary.hasReportedLiquidityDrift).toBe(true);
    expect(summary.reportedLiquidityDrift).toBe(-580.5);
  });

  it("returns zero ratios when the pool is empty", () => {
    const summary = summarizeCapitalPool({
      totalLiquidity: "0.00",
      availableLiquidity: "0.00",
      deployedLiquidity: "0.00",
      accruedYield: "0.00",
      protocolFeesCollected: "0.00",
    });

    expect(summary.managedCapital).toBe(0);
    expect(summary.availableRatio).toBe(0);
    expect(summary.deploymentRatio).toBe(0);
    expect(summary.hasReportedLiquidityDrift).toBe(false);
  });
});
