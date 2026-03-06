import { formatCurrency } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats ISO currencies with Intl currency formatting", () => {
    expect(formatCurrency(1250, "USD")).toBe("$1,250.00");
  });

  it("falls back to decimal formatting for non-ISO codes like USDC", () => {
    expect(formatCurrency(1200, "USDC")).toBe("1,200.00 USDC");
  });
});
