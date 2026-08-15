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
        equipment={data.equipment.map(toEquipmentDTO)}
        pendingRequests={data.operationRequests.map(toOperationRequestDTO)}
      />
    </OrgAccent>
  );
}
