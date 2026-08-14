import { getDashboardData } from "@/lib/queries";
import { toEquipmentDTO, toOperationRequestDTO } from "@/lib/mappers";
import { requireActiveOrgPage } from "@/lib/authz";
import { WorkspaceConsole } from "@/components/workspace/workspace-console";
import { OrgAccent } from "@/components/brand/org-accent";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const session = await requireActiveOrgPage();
  const data = await getDashboardData(session.orgId);

  return (
    <OrgAccent branding={session.branding}>
    <WorkspaceConsole
      orgName={session.orgName}
      userName={session.name}
      userId={session.userId}
      role={session.role}
      logoUrl={session.branding?.logoUrl}
      counts={data.counts}
      equipment={data.equipment.map(toEquipmentDTO)}
      locations={data.locations.map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      }))}
      pendingRequests={data.operationRequests.map(toOperationRequestDTO)}
      members={data.members
        .filter((member) => member.status === "ACTIVE")
        .map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role === "OWNER" ? "OWNER" : "STAFF",
          status: member.status,
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
    </OrgAccent>
  );
}
