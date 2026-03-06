import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { NoticeBanner } from "@/components/notice-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasGoogleOauthConfig } from "@/lib/env";
import { getCurrentSessionUser } from "@/lib/auth/session";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: Props) {
  const user = await getCurrentSessionUser();
  const query = (await searchParams) ?? {};
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  if (user) {
    redirect("/factoring-dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Secure access
          </p>
          <CardTitle>Sign in to the integration dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Use a verified Gmail account through Google sign-in, or fall back to the local password-based admin credentials when they are enabled for the environment.
          </p>
          <NoticeBanner error={error} notice={notice} />
          <LoginForm googleEnabled={hasGoogleOauthConfig()} />
        </CardContent>
      </Card>
    </main>
  );
}
