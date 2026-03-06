import Link from "next/link";
import { ArrowRight, DatabaseZap, ShieldCheck, Workflow } from "lucide-react";

import { AppBrand } from "@/components/app-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Embedded working capital",
    description:
      "Let finance teams unlock cash from outstanding invoices without leaving the PandaDoc workflow.",
    icon: ShieldCheck,
  },
  {
    title: "QuickBooks invoice import",
    description:
      "Pull unpaid invoices into a clean dashboard with eligibility, terms, and one-click capital withdrawal.",
    icon: DatabaseZap,
  },
  {
    title: "Retention and monetization",
    description:
      "Show how every funded invoice can create seller value, capital-provider yield, and a fee stream for PandaDoc.",
    icon: Workflow,
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
              <span className="inline-flex rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
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
          <Card className="protofire-hero relative overflow-hidden border border-white/12">
            <div className="protofire-wave absolute inset-0 opacity-35" />
            <CardContent className="relative space-y-4 p-8">
              <div className="rounded-[1.25rem] border border-white/12 bg-white/6 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  Current milestone
                </p>
                <h2 className="mt-3 font-[var(--font-heading)] text-2xl font-semibold text-white">
                  Import invoices. Offer capital. Simulate repayment.
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  This MVP demonstrates the full loop: invoice sync, indicative
                  terms, withdrawal, provider yield, platform fees, and repayment
                  tracking in one workflow.
                </p>
              </div>
              <div className="grid gap-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-[1.25rem] border border-white/12 bg-white/6 p-5 backdrop-blur"
                  >
                    <feature.icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-semibold text-white">{feature.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
