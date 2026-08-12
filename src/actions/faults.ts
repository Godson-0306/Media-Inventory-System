"use server";

import { revalidatePath } from "next/cache";
import { FaultStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

function refresh() {
  revalidatePath("/workspace");
  revalidatePath("/admin");
  revalidatePath("/admin/faults");
  revalidatePath("/admin/history");
  revalidatePath("/admin/equipment");
}

export async function updateFaultStatus(faultId: string, status: FaultStatus) {
  const session = await requireSession();
  const fault = await prisma.fault.findFirst({
    where: { id: faultId, orgId: session.orgId },
  });
  if (!fault) return { error: "Fault not found" };

  await prisma.fault.update({
    where: { id: fault.id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  if (status === "RESOLVED") {
    await prisma.equipment.update({
      where: { id: fault.equipmentId },
      data: { status: "AVAILABLE", currentOperator: null },
    });
  } else if (status === "IN_REPAIR") {
    await prisma.equipment.update({
      where: { id: fault.equipmentId },
      data: { status: "FAULTY" },
    });
  }

  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: fault.equipmentId,
      action: "FAULT_UPDATED",
      details: { faultId: fault.id, status },
    },
  });
  refresh();
  return { ok: true };
}
