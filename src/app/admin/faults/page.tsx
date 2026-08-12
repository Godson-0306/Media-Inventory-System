import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { FaultsAdmin } from "@/components/admin/faults-admin";

export const dynamic = "force-dynamic";

export default async function FaultsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);
  return (
    <FaultsAdmin
      faults={data.faults.map((item) => ({
        id: item.id,
        status: item.status,
        description: item.description,
        reportedAt: item.reportedAt.toISOString(),
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
        equipmentName: item.equipment.name,
        equipmentId: item.equipmentId,
        reporterName: item.reporter.name,
      }))}
    />
  );
}
