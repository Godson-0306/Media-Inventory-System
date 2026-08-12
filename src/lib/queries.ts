import { prisma } from "@/lib/db";
import { EquipmentStatus } from "@prisma/client";

export async function getDashboardData(orgId: string) {
  const [equipment, activities, rentals, faults] = await Promise.all([
    prisma.equipment.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: { orgId },
      include: { user: true, equipment: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.rental.findMany({
      where: { orgId },
      include: { equipment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fault.findMany({
      where: { orgId },
      include: { equipment: true, reporter: true },
      orderBy: { reportedAt: "desc" },
    }),
  ]);

  const counts = {
    total: equipment.length,
    available: equipment.filter((item) => item.status === "AVAILABLE").length,
    inUse: equipment.filter((item) => item.status === "IN_USE").length,
    faulty: equipment.filter((item) => item.status === "FAULTY").length,
    rentedOut: equipment.filter((item) => item.status === "RENTED_OUT").length,
    rentalsIn: rentals.filter((item) => item.type === "IN" && item.status === "ACTIVE").length,
    rentalsOut: rentals.filter((item) => item.type === "OUT" && item.status === "ACTIVE").length,
    openFaults: faults.filter((item) => item.status !== "RESOLVED").length,
  };

  const mostUsed = [...equipment]
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 6);

  const categoryBreakdown = equipment.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const statusBreakdown = equipment.reduce<Record<EquipmentStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { AVAILABLE: 0, IN_USE: 0, FAULTY: 0, RENTED_OUT: 0 },
  );

  return {
    equipment,
    activities,
    rentals,
    faults,
    counts,
    mostUsed,
    categoryBreakdown,
    statusBreakdown,
  };
}
