import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { JoinInviteForm } from "@/components/auth/join-invite-form";

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#0b0f19_0%,#0a1120_100%)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-semibold">Join {invite.org.name}</p>
            <p className="text-sm text-muted-foreground">
              Create your staff account for this company workspace.
            </p>
          </div>
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
  );
}
