import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { JoinInviteForm } from "@/components/auth/join-invite-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OrgAccent } from "@/components/brand/org-accent";
import { resolveBranding } from "@/lib/org";

export const dynamic = "force-dynamic";

export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: true },
  });
  if (!invite) notFound();

  const expired = invite.expiresAt.getTime() <= Date.now();
  const used = Boolean(invite.usedAt);
  const branding = resolveBranding(invite.org);

  return (
    <OrgAccent branding={branding}>
    <main className="min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_32%)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo src={branding?.logoUrl} alt={invite.org.name} />
            <div>
              <p className="font-semibold">
                {branding?.loginHeadline || `Join ${branding?.brandName || invite.org.name}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {branding?.loginTagline || "Create your staff account for this company workspace."}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          {used || expired ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {used
                  ? "This invite has already been used."
                  : "This invite has expired."}
              </p>
              <p>
                Ask the owner for a new link, or join with the company code on{" "}
                <Link href="/join" className="text-primary hover:underline">
                  /join
                </Link>
                .
              </p>
            </div>
          ) : (
            <JoinInviteForm
              token={invite.token}
              lockedEmail={invite.email}
              orgName={invite.org.name}
            />
          )}
        </div>
      </div>
    </main>
    </OrgAccent>
  );
}
