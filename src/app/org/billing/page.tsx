import { requireSignedInPage } from "@/lib/authz";
import { isOrgActive } from "@/lib/org";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PLAN_ORDER, PLAN_LIMITS, formatNaira, asPlanId } from "@/lib/plans";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await requireSignedInPage();
  const active = isOrgActive(session);
  const trialEnded =
    session.subscriptionStatus === "TRIAL" &&
    session.trialEndsAt != null &&
    session.trialEndsAt.getTime() <= Date.now();
  const currentPlan = asPlanId(session.plan);

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Logo src={session.branding?.logoUrl} alt={session.orgName} />
          <div>
            <p className="font-semibold">{session.orgName}</p>
            <p className="text-xs text-muted-foreground">Plans and billing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session.role === "OWNER" && active ? (
            <Link
              href="/admin"
              className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm hover:bg-muted"
            >
              Back to admin
            </Link>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Card className="p-6">
          {session.role === "OWNER" ? (
            <>
              <h1 className="text-2xl font-semibold">
                {active ? "Subscription" : "Company access paused"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {trialEnded
                  ? "Your trial has ended. Staff cannot use the workspace until a plan is paid."
                  : active
                    ? "Your organization currently has access. Flutterwave checkout will attach to these plans later."
                    : "This organization’s subscription is not active. Staff access stays paused until it is restored."}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Status: {session.subscriptionStatus} · Plan: {PLAN_LIMITS[currentPlan].name}
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
        </Card>

        {session.role === "OWNER" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const plan = PLAN_LIMITS[id];
              const current = id === currentPlan;
              return (
                <Card key={id} className={`p-5 ${current ? "ring-2 ring-primary" : ""}`}>
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatNaira(plan.priceNgn)}
                    <span className="text-sm font-normal text-muted-foreground"> / month</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.blurb}</p>
                  <ul className="mt-4 space-y-1 text-sm">
                    <li>{plan.maxItems == null ? "Unlimited items" : `${plan.maxItems} items`}</li>
                    <li>
                      {plan.maxLocations == null
                        ? "Unlimited locations"
                        : `${plan.maxLocations} saved location${plan.maxLocations === 1 ? "" : "s"}`}
                    </li>
                    <li>Light and dark mode</li>
                    <li>{plan.branding ? "Custom organization interface" : "Default product look"}</li>
                  </ul>
                  <Button className="mt-5 w-full" disabled>
                    {current ? "Current plan" : "Checkout with Flutterwave — coming soon"}
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : null}

        <div>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
