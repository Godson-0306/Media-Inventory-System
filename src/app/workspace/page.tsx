import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { toEquipmentDTO, toOperationRequestDTO } from "@/lib/mappers";
import { WorkspaceConsole } from "@/components/workspace/workspace-console";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);

  return (
    <WorkspaceConsole
      orgName={session.orgName}
      userName={session.name}
      userId={session.userId}
      counts={data.counts}
      equipment={data.equipment.map(toEquipmentDTO)}
      pendingRequests={data.operationRequests.map(toOperationRequestDTO)}
      members={data.members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
      }))}
      activities={data.activities.map((item) => ({
        id: item.id,
        action: item.action,
        createdAt: item.createdAt.toISOString(),
        details: (item.details as Record<string, unknown> | null) ?? null,
        userName: item.user?.name ?? null,
        equipmentName: item.equipment?.name ?? null,
      }))}
    />
  );
}
