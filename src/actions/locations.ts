"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { capReached, planLimits } from "@/lib/plans";
import { locationSchema, locationUpdateSchema, equipmentIdSchema } from "@/lib/validations";

function refreshLocations() {
  revalidatePath("/admin/locations");
  revalidatePath("/workspace");
  revalidatePath("/admin");
}

export async function createLocation(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid location" };
  }

  const count = await prisma.orgLocation.count({ where: { orgId: session.orgId } });
  const limits = planLimits(session.plan);
  if (capReached(count, limits.maxLocations)) {
    return {
      error: `This plan allows ${limits.maxLocations} office site${limits.maxLocations === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }

  const location = await prisma.orgLocation.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      address: parsed.data.address || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "LOCATION_CREATED",
      details: { name: location.name },
    },
  });
  refreshLocations();
  return { ok: true };
}

export async function updateLocation(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = locationUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid location" };
  }

  const existing = await prisma.orgLocation.findFirst({
    where: { id: parsed.data.id, orgId: session.orgId },
  });
  if (!existing) return { error: "Location not found" };

  await prisma.orgLocation.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "LOCATION_UPDATED",
      details: { name: parsed.data.name },
    },
  });
  refreshLocations();
  return { ok: true };
}

export async function deleteLocation(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = equipmentIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Location not found" };

  const existing = await prisma.orgLocation.findFirst({
    where: { id: parsed.data.id, orgId: session.orgId },
  });
  if (!existing) return { error: "Location not found" };

  const remaining = await prisma.orgLocation.count({ where: { orgId: session.orgId } });
  if (remaining <= 1) {
    return { error: "Keep at least one office or storage site" };
  }

  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "LOCATION_DELETED",
      details: { name: existing.name },
    },
  });
  await prisma.orgLocation.delete({ where: { id: existing.id } });
  refreshLocations();
  return { ok: true };
}
