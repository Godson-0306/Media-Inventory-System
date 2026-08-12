import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
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
      counts={data.counts}
      equipment={data.equipment.map((item) => ({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        brand: item.brand,
        model: item.model,
        category: item.category,
        status: item.status,
        currentOperator: item.currentOperator,
        useCount: item.useCount,
        conditionNotes: item.conditionNotes,
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
