import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEquipmentLife } from "@/lib/queries";
import { toEquipmentDTO } from "@/lib/mappers";
import { LifeRecord } from "@/components/equipment/life-record";

export const dynamic = "force-dynamic";

export default async function AdminEquipmentLifePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const { id } = await params;
  const data = await getEquipmentLife(session.orgId, id);
  if (!data) notFound();

  return (
    <LifeRecord
      backHref="/admin/equipment"
      canManage
      equipment={toEquipmentDTO(data.equipment)}
      timeline={data.timeline}
      locationPings={data.locationPings.map((ping) => ({
        id: ping.id,
        latitude: ping.latitude,
        longitude: ping.longitude,
        accuracy: ping.accuracy,
        createdAt: ping.createdAt.toISOString(),
      }))}
      faults={data.faults.map((item) => ({
        id: item.id,
        status: item.status,
        description: item.description,
        reportedAt: item.reportedAt.toISOString(),
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
        equipmentName: data.equipment.name,
        equipmentId: item.equipmentId,
        reporterName: item.reporter.name,
      }))}
      rentals={data.rentals.map((item) => ({
        id: item.id,
        type: item.type,
        status: item.status,
        counterparty: item.counterparty,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate?.toISOString() ?? null,
        notes: item.notes,
        equipmentName: data.equipment.name,
        equipmentId: item.equipmentId,
      }))}
    />
  );
}
