import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { MembersAdmin } from "@/components/admin/members-admin";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);
  return (
    <MembersAdmin
      members={data.members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
      }))}
    />
  );
}
