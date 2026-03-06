import { redirect } from "next/navigation";

import { AppBrand } from "@/components/app-brand";
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
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="protofire-hero relative overflow-hidden border border-white/12">
          <div className="protofire-wave absolute inset-0 opacity-40" />
          <CardContent className="relative flex h-full flex-col justify-between gap-10 p-8">
            <div className="space-y-5">
              <AppBrand className="w-fit" />
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Secure access
                </p>
                <h1 className="font-[var(--font-heading)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Bring factoring operations into one branded command surface.
                </h1>
                <p className="max-w-xl text-sm text-slate-300">
                  Use a verified Gmail account through Google sign-in, or fall back to the local password-based admin credentials when they are enabled for the environment.
                </p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/12 bg-white/6 p-4">
                Secure OAuth
              </div>
              <div className="rounded-[1.25rem] border border-white/12 bg-white/6 p-4">
                Invoice sync
              </div>
              <div className="rounded-[1.25rem] border border-white/12 bg-white/6 p-4">
                Withdraw capital
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardHeader className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sign in
            </p>
            <CardTitle>Access the integration dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <NoticeBanner error={error} notice={notice} />
            <LoginForm googleEnabled={hasGoogleOauthConfig()} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
