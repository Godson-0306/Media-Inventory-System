"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { equipmentSchema } from "@/lib/validations";

function parseOptionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createEquipment(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  const session = auth.session;
  const parsed = equipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid equipment details" };
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
        locationLabel: "Storage / cage",
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
    revalidatePath("/workspace");
    revalidatePath("/admin");
    revalidatePath("/admin/equipment");
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That serial number already exists in this organization" };
    }
    return { error: "Could not create the asset" };
  }
}
