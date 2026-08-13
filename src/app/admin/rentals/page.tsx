import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { toEquipmentDTO } from "@/lib/mappers";
import { RentalsAdmin } from "@/components/admin/rentals-admin";

export const dynamic = "force-dynamic";

export default async function RentalsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);
  return (
    <RentalsAdmin
      rentals={data.rentals.map((item) => ({
        id: item.id,
        type: item.type,
        status: item.status,
        counterparty: item.counterparty,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate?.toISOString() ?? null,
        notes: item.notes,
        equipmentName: item.equipment?.name ?? null,
        equipmentId: item.equipmentId,
      }))}
      equipment={data.equipment.map(toEquipmentDTO)}
    />
  );
}
