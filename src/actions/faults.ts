"use server";

import { revalidatePath } from "next/cache";
import { FaultStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { CLEAR_LIVE_LOCATION } from "@/lib/constants";

function refresh() {
  revalidatePath("/workspace");
  revalidatePath("/admin");
  revalidatePath("/admin/faults");
  revalidatePath("/admin/history");
  revalidatePath("/admin/equipment");
}

export async function updateFaultStatus(faultId: string, status: FaultStatus) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
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
      data: {
        status: "ACTIVE",
        currentOperator: null,
        signedOutAt: null,
        locationLabel: "Storage / cage",
        latitude: null,
        longitude: null,
        ...CLEAR_LIVE_LOCATION,
      },
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
