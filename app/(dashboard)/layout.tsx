import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-white/70 backdrop-blur">
        <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/"
              className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight"
            >
              pandadoc-qbo-integration
            </Link>
            <p className="text-sm text-muted-foreground">
              Secure OAuth, invoice import, and webhook-ready workflow foundations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-2 rounded-full border border-border bg-white/80 p-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/integrations">Integrations</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/factoring-dashboard">Factoring dashboard</Link>
              </Button>
            </nav>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
