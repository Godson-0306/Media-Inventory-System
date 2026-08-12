"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { faultSchema, operationSchema } from "@/lib/validations";

function refresh() {
  revalidatePath("/workspace");
  revalidatePath("/admin");
  revalidatePath("/admin/equipment");
  revalidatePath("/admin/faults");
  revalidatePath("/admin/history");
  revalidatePath("/admin/rentals");
}

export async function signOutEquipment(input: unknown) {
  const session = await requireSession();
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };
  if (item.status !== "AVAILABLE") {
    return { error: "Only available equipment can be signed out" };
  }

  await prisma.equipment.update({
    where: { id: item.id },
    data: {
      status: "IN_USE",
      currentOperator: parsed.data.operatorName,
      useCount: { increment: 1 },
    },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: item.id,
      action: "SIGN_OUT",
      details: {
        operatorName: parsed.data.operatorName,
        notes: parsed.data.notes ?? "",
      },
    },
  });
  refresh();
  return { ok: true };
}

export async function returnEquipment(input: unknown) {
  const session = await requireSession();
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };
  if (item.status !== "IN_USE" && item.status !== "RENTED_OUT") {
    return { error: "This asset is not currently out" };
  }

  await prisma.equipment.update({
    where: { id: item.id },
    data: { status: "AVAILABLE", currentOperator: null },
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: item.id,
      action: "RETURN",
      details: {
        operatorName: parsed.data.operatorName,
        notes: parsed.data.notes ?? "",
      },
    },
  });
  refresh();
  return { ok: true };
}

export async function reportFault(input: unknown) {
  const session = await requireSession();
  const parsed = faultSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const item = await prisma.equipment.findFirst({
    where: { id: parsed.data.equipmentId, orgId: session.orgId },
  });
  if (!item) return { error: "Equipment not found" };

  await prisma.$transaction([
    prisma.equipment.update({
      where: { id: item.id },
      data: { status: "FAULTY", currentOperator: parsed.data.operatorName },
    }),
    prisma.fault.create({
      data: {
        orgId: session.orgId,
        equipmentId: item.id,
        reporterId: session.userId,
        description: parsed.data.description,
      },
    }),
    prisma.activity.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        equipmentId: item.id,
        action: "FAULT_REPORTED",
        details: {
          operatorName: parsed.data.operatorName,
          description: parsed.data.description,
        },
      },
    }),
  ]);
  refresh();
  return { ok: true };
}
