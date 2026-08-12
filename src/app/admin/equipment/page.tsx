import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { EquipmentAdmin } from "@/components/admin/equipment-admin";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);
  return (
    <EquipmentAdmin
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
    />
  );
}
