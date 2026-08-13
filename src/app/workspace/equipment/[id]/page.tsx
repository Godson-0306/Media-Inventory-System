import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEquipmentLife } from "@/lib/queries";
import { toEquipmentDTO } from "@/lib/mappers";
import { LifeRecord } from "@/components/equipment/life-record";
import { Logo } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

export default async function WorkspaceEquipmentPage({
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
    <main className="min-h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Logo />
        <div>
          <p className="font-semibold">{session.orgName} Operations Console</p>
          <p className="text-xs text-muted-foreground">Equipment life record</p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-4 lg:p-6">
        <LifeRecord
          backHref="/workspace"
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
      </div>
    </main>
  );
}
