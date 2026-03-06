import Link from "next/link";
import { ArrowRight, DatabaseZap, ShieldCheck, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Dual OAuth foundation",
    description:
      "Independent PandaDoc and QuickBooks Online connections with secure server-side token storage.",
    icon: ShieldCheck,
  },
  {
    title: "Invoice normalization",
    description:
      "Outstanding QuickBooks invoices are normalized into a stable internal model ready for future workflows.",
    icon: DatabaseZap,
  },
  {
    title: "Webhook-ready architecture",
    description:
      "PandaDoc webhook ingestion is in place so document state sync can be layered in without refactoring.",
    icon: Workflow,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="container py-12 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-border bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              PandaDoc ↔ QuickBooks Online
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-[var(--font-heading)] text-5xl font-semibold tracking-tight text-balance md:text-6xl">
                Sync outstanding QuickBooks invoices into a PandaDoc-ready control plane.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                `pandadoc-qbo-integration` is a production-minded Next.js foundation with secure OAuth, token refresh, invoice normalization, webhook ingestion, and background-sync hooks.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/factoring-dashboard">Go to factoring dashboard</Link>
              </Button>
            </div>
          </div>
          <Card className="overflow-hidden border-none bg-hero-grid">
            <CardContent className="space-y-4 p-8">
              <div className="rounded-[1.25rem] border border-white/60 bg-white/80 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Current milestone
                </p>
                <h2 className="mt-3 font-[var(--font-heading)] text-2xl font-semibold">
                  Connect. Import. Normalize. Re-sync.
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  The data model already anticipates document-to-invoice links, payment propagation, and PandaDoc document generation from invoice data.
                </p>
              </div>
              <div className="grid gap-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-[1.25rem] border border-border/60 bg-white/85 p-5"
                  >
                    <feature.icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
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
