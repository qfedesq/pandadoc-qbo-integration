import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppBrand } from "@/components/app-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const demoSteps = [
  {
    title: "Connect systems",
    description: "Link PandaDoc and QuickBooks once. Keep setup lightweight.",
  },
  {
    title: "Prioritize eligible invoices",
    description: "Surface only the receivables that can become immediate liquidity.",
  },
  {
    title: "Withdraw and track repayment",
    description: "Advance capital in one click and follow the lifecycle end to end.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="container py-12 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-7">
            <AppBrand className="w-fit" />
            <div className="space-y-4">
              <span className="inline-flex rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                Embedded finance for PandaDoc
              </span>
              <h1 className="max-w-4xl font-[var(--font-heading)] text-5xl font-semibold tracking-tight text-balance text-white md:text-6xl">
                Embed working capital directly into PandaDoc&apos;s invoice workflow.
              </h1>
              <p className="max-w-3xl text-lg text-slate-300">
                Connect QuickBooks, surface eligible invoices, and let users click
                &ldquo;Withdraw Capital&rdquo; to turn receivables into immediate
                liquidity inside the product.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Open demo workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/factoring-dashboard">View seller flow</Link>
              </Button>
            </div>
          </div>
          <Card className="border border-white/12">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  Demo flow
                </p>
                <h2 className="font-[var(--font-heading)] text-2xl font-semibold text-white">
                  A tighter seller journey, not a noisy finance console.
                </h2>
                <p className="text-sm text-slate-300">
                  The interface is designed to keep attention on one decision:
                  which eligible invoice should be converted into working capital now.
                </p>
              </div>
              <div className="grid gap-3">
                {demoSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="grid gap-3 rounded-[1rem] border border-white/12 bg-white/4 p-4 md:grid-cols-[auto_1fr]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/6 text-sm font-semibold text-primary">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 border-t border-white/10 pt-5 text-sm text-slate-300 md:grid-cols-3">
                <div className="rounded-[1rem] border border-white/10 bg-white/4 p-4">
                  Seller value: faster cash flow from open invoices.
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/4 p-4">
                  Provider value: funded positions with tracked repayment.
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/4 p-4">
                  PandaDoc value: retention and fee revenue inside workflow.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
