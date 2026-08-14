import { requireSignedInPage } from "@/lib/authz";
import { isOrgActive } from "@/lib/org";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await requireSignedInPage();
  const active = isOrgActive(session);
  const trialEnded =
    session.subscriptionStatus === "TRIAL" &&
    session.trialEndsAt != null &&
    session.trialEndsAt.getTime() <= Date.now();

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Logo />
        <div>
          <p className="font-semibold">{session.orgName}</p>
          <p className="text-xs text-muted-foreground">Company access</p>
        </div>
      </header>
      <div className="mx-auto max-w-xl p-6">
        <Card className="p-6">
          {session.role === "OWNER" ? (
            <>
              <h1 className="text-2xl font-semibold">
                {active ? "Subscription" : "Company access paused"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {trialEnded
                  ? "Your trial has ended. Staff cannot use the workspace until access is renewed. Billing checkout will be added next; contact support if you need the trial extended."
                  : active
                    ? "Your organization currently has access. Paid billing will attach to this company later."
                    : "This organization’s subscription is not active. Staff access stays paused until it is restored."}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Status: {session.subscriptionStatus}
                {session.trialEndsAt
                  ? ` · trial ends ${session.trialEndsAt.toLocaleDateString()}`
                  : ""}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Company access paused</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {session.orgName} does not currently have an active subscription. Ask the
                organization owner to restore access.
              </p>
            </>
          )}
          <div className="mt-6">
            <SignOutButton />
          </div>
        </Card>
      </div>
    </main>
  );
}
