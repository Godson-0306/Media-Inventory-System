"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { capReached, planLimits } from "@/lib/plans";
import { HOME_LOCATION } from "@/lib/constants";
import { equipmentIdSchema, equipmentSchema, equipmentUpdateSchema } from "@/lib/validations";

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function refreshEquipment(id?: string) {
  revalidatePath("/workspace");
  revalidatePath("/admin");
  revalidatePath("/admin/equipment");
  if (id) revalidatePath(`/admin/equipment/${id}`);
}

export async function createEquipment(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid equipment details" };
  }

  const count = await prisma.equipment.count({ where: { orgId: session.orgId } });
  const limits = planLimits(session.plan);
  if (capReached(count, limits.maxItems)) {
    return {
      error: `This plan allows ${limits.maxItems} items. Delete an asset or upgrade to add more.`,
    };
  }

  try {
    const item = await prisma.equipment.create({
      data: {
        orgId: session.orgId,
        name: parsed.data.name,
        serialNumber: parsed.data.serialNumber,
        brand: parsed.data.brand,
        model: parsed.data.model,
        category: parsed.data.category,
        purchaseDate: parseOptionalDate(parsed.data.purchaseDate),
        warrantyDate: parseOptionalDate(parsed.data.warrantyDate),
        conditionNotes: parsed.data.conditionNotes ?? "",
        locationLabel: HOME_LOCATION.label,
      },
    });
    await prisma.activity.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        equipmentId: item.id,
        action: "EQUIPMENT_CREATED",
        details: { name: item.name, serialNumber: item.serialNumber },
      },
    });
    refreshEquipment(item.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That serial number already exists in this organization" };
    }
    return { error: "Could not create the asset" };
  }
}

export async function updateEquipment(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = equipmentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid equipment details" };
  }

  const existing = await prisma.equipment.findFirst({
    where: { id: parsed.data.id, orgId: session.orgId },
  });
  if (!existing) return { error: "Equipment not found" };

  try {
    const item = await prisma.equipment.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        serialNumber: parsed.data.serialNumber,
        brand: parsed.data.brand,
        model: parsed.data.model,
        category: parsed.data.category,
        purchaseDate: parseOptionalDate(parsed.data.purchaseDate),
        warrantyDate: parseOptionalDate(parsed.data.warrantyDate),
        conditionNotes: parsed.data.conditionNotes ?? "",
      },
    });
    await prisma.activity.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        equipmentId: item.id,
        action: "EQUIPMENT_UPDATED",
        details: { name: item.name, serialNumber: item.serialNumber },
      },
    });
    refreshEquipment(item.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That serial number already exists in this organization" };
    }
    return { error: "Could not update the asset" };
  }
}

export async function deleteEquipment(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = equipmentIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Equipment not found" };

  const existing = await prisma.equipment.findFirst({
    where: { id: parsed.data.id, orgId: session.orgId },
  });
  if (!existing) return { error: "Equipment not found" };
  if (existing.status === "SIGNED_OUT") {
    return { error: "Sign this asset in before deleting it" };
  }

  const pending = await prisma.operationRequest.findFirst({
    where: { orgId: session.orgId, equipmentId: existing.id, status: "PENDING" },
  });
  if (pending) {
    return { error: "Resolve or cancel the pending request before deleting this asset" };
  }

  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: existing.id,
      action: "EQUIPMENT_DELETED",
      details: { name: existing.name, serialNumber: existing.serialNumber },
    },
  });
  await prisma.equipment.delete({ where: { id: existing.id } });
  refreshEquipment(existing.id);
  return { ok: true };
}
