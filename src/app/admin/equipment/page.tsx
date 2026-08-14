import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { toEquipmentDTO } from "@/lib/mappers";
import { EquipmentAdmin } from "@/components/admin/equipment-admin";
import { prisma } from "@/lib/db";
import { planLimits } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);
  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { plan: true },
  });
  return (
    <EquipmentAdmin
      equipment={data.equipment.map(toEquipmentDTO)}
      maxItems={planLimits(org?.plan).maxItems}
    />
  );
}
