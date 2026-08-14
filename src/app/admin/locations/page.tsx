import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/authz";
import { planLimits } from "@/lib/plans";
import { LocationsAdmin } from "@/components/admin/locations-admin";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const session = await requireOwnerPage();
  const [locations, org] = await Promise.all([
    prisma.orgLocation.findMany({
      where: { orgId: session.orgId },
      orderBy: { name: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: session.orgId },
      select: { plan: true },
    }),
  ]);

  return (
    <LocationsAdmin
      locations={locations.map((item) => ({
        id: item.id,
        name: item.name,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
      }))}
      maxLocations={planLimits(org?.plan).maxLocations}
    />
  );
}
