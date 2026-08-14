import { prisma } from "@/lib/db";
import { EquipmentStatus } from "@prisma/client";
import { actionLabel } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getDashboardData(orgId: string) {
  const [equipment, activities, rentals, faults, pendingRequests, members, locations] = await Promise.all([
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
    prisma.operationRequest.findMany({
      where: { orgId },
      include: { equipment: true, requester: true, reviewedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    }),
    prisma.orgLocation.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
  ]);

  const counts = {
    total: equipment.length,
    active: equipment.filter((item) => item.status === "ACTIVE").length,
    signedOut: equipment.filter((item) => item.status === "SIGNED_OUT").length,
    signedIn: equipment.filter((item) => item.status === "SIGNED_IN").length,
    faulty: equipment.filter((item) => item.status === "FAULTY").length,
    rentalsIn: rentals.filter((item) => item.type === "IN" && item.status === "ACTIVE").length,
    rentalsOut: rentals.filter((item) => item.type === "OUT" && item.status === "ACTIVE").length,
    openFaults: faults.filter((item) => item.status !== "RESOLVED").length,
    pendingRequests: pendingRequests.filter((item) => item.status === "PENDING").length,
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
    { ACTIVE: 0, SIGNED_OUT: 0, SIGNED_IN: 0, FAULTY: 0 },
  );

  return {
    equipment,
    activities,
    rentals,
    faults,
    operationRequests: pendingRequests,
    members,
    locations,
    counts,
    mostUsed,
    categoryBreakdown,
    statusBreakdown,
  };
}

export async function getEquipmentLife(orgId: string, equipmentId: string) {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, orgId },
  });
  if (!equipment) return null;

  const [activities, faults, rentals, locationPings] = await Promise.all([
    prisma.activity.findMany({
      where: { orgId, equipmentId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fault.findMany({
      where: { orgId, equipmentId },
      include: { reporter: true },
      orderBy: { reportedAt: "desc" },
    }),
    prisma.rental.findMany({
      where: { orgId, equipmentId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.locationPing.findMany({
      where: { orgId, equipmentId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const timeline: TimelineEvent[] = activities.map((item) => {
    const details = asRecord(item.details);
    const place = asString(details.place);
    const duration = asString(details.duration);
    const operator = asString(details.operatorName);
    const description = asString(details.description);
    const parts = [
      operator ? `Operator: ${operator}` : null,
      place,
      duration ? `Out for ${duration}` : null,
      description,
      asString(details.notes),
    ].filter(Boolean);

    return {
      id: item.id,
      action: item.action,
      createdAt: item.createdAt.toISOString(),
      summary: parts.join(" · ") || actionLabel(item.action),
      userName: item.user?.name ?? null,
      place,
      address: asString(details.address),
      latitude: asNumber(details.lat),
      longitude: asNumber(details.lng),
    };
  });

  const locationHistory = timeline.filter(
    (item) => item.latitude !== null && item.longitude !== null,
  );

  return {
    equipment,
    faults,
    rentals,
    timeline,
    locationHistory,
    locationPings: [...locationPings].reverse(),
  };
}
