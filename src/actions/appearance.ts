"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { hasCustomInterface } from "@/lib/plans";
import { appearanceSchema } from "@/lib/validations";

export async function updateAppearance(input: unknown) {
  const auth = await requireOwner();
  if (!auth.ok) return { error: auth.error };
  if (!hasCustomInterface(auth.session.plan)) {
    return { error: "Custom interface is included on Enterprise" };
  }
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid appearance details" };
  }

  await prisma.organization.update({
    where: { id: auth.session.orgId },
    data: {
      brandName: parsed.data.brandName?.trim() || null,
      logoUrl: parsed.data.logoUrl?.trim() || null,
      accentColor: parsed.data.accentColor?.trim() || null,
      loginHeadline: parsed.data.loginHeadline?.trim() || null,
      loginTagline: parsed.data.loginTagline?.trim() || null,
    },
  });
  await prisma.activity.create({
    data: {
      orgId: auth.session.orgId,
      userId: auth.session.userId,
      action: "APPEARANCE_UPDATED",
    },
  });
  revalidatePath("/admin/appearance");
  revalidatePath("/admin", "layout");
  revalidatePath("/workspace");
  revalidatePath("/join");
  return { ok: true };
}
