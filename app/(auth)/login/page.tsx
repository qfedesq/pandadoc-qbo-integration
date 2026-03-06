import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentSessionUser();

  if (user) {
    redirect("/factoring-dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Admin access
          </p>
          <CardTitle>Sign in to the integration dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Use the seeded admin credentials from your local environment to manage PandaDoc and QuickBooks connections inside the factoring dashboard.
          </p>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
