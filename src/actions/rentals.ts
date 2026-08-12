"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { rentalSchema } from "@/lib/validations";

function refresh() {
  revalidatePath("/workspace");
  revalidatePath("/admin");
  revalidatePath("/admin/rentals");
  revalidatePath("/admin/history");
  revalidatePath("/admin/equipment");
}

export async function createRental(input: unknown) {
  const session = await requireSession();
  const parsed = rentalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rental details" };
  }

  let equipmentId = parsed.data.equipmentId || null;
  if (equipmentId) {
    const item = await prisma.equipment.findFirst({
      where: { id: equipmentId, orgId: session.orgId },
    });
    if (!item) return { error: "Equipment not found" };
    if (parsed.data.type === "OUT" && item.status !== "AVAILABLE") {
      return { error: "Only available equipment can be sent out on rental" };
    }
  }

  const rental = await prisma.rental.create({
    data: {
      orgId: session.orgId,
      equipmentId,
      type: parsed.data.type,
      counterparty: parsed.data.counterparty,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      notes: parsed.data.notes ?? "",
    },
  });

  if (equipmentId && parsed.data.type === "OUT") {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { status: "RENTED_OUT", currentOperator: parsed.data.counterparty },
    });
  }

  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId,
      action: "RENTAL_CREATED",
      details: {
        type: parsed.data.type,
        counterparty: parsed.data.counterparty,
        rentalId: rental.id,
      },
    },
  });
  refresh();
  return { ok: true };
}

export async function returnRental(rentalId: string) {
  const session = await requireSession();
  const rental = await prisma.rental.findFirst({
    where: { id: rentalId, orgId: session.orgId },
  });
  if (!rental) return { error: "Rental not found" };
  if (rental.status !== "ACTIVE") return { error: "This rental is already closed" };

  await prisma.rental.update({
    where: { id: rental.id },
    data: { status: "RETURNED", endDate: rental.endDate ?? new Date() },
  });
  if (rental.equipmentId && rental.type === "OUT") {
    await prisma.equipment.update({
      where: { id: rental.equipmentId },
      data: { status: "AVAILABLE", currentOperator: null },
    });
  }
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      equipmentId: rental.equipmentId,
      action: "RENTAL_RETURNED",
      details: { rentalId: rental.id, counterparty: rental.counterparty },
    },
  });
  refresh();
  return { ok: true };
}
