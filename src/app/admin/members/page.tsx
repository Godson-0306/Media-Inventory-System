import { prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/queries";
import { requireOwnerPage } from "@/lib/authz";
import { MembersAdmin } from "@/components/admin/members-admin";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await requireOwnerPage();
  const [data, invites] = await Promise.all([
    getDashboardData(session.orgId),
    prisma.orgInvite.findMany({
      where: { orgId: session.orgId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <MembersAdmin
      joinCode={session.joinCode}
      invites={invites.map((invite) => ({
        id: invite.id,
        token: invite.token,
        email: invite.email,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      }))}
      members={data.members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role === "OWNER" ? "OWNER" : "STAFF",
        status: member.status,
        createdAt: member.createdAt.toISOString(),
      }))}
    />
  );
}
