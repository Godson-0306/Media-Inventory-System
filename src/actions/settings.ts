"use server";

import { revalidatePath } from "next/cache";
import { EquipmentCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, requireSession, verifyPassword } from "@/lib/auth";
import { passwordChangeSchema } from "@/lib/validations";

const SAMPLE_KIT: Array<{
  name: string;
  serialNumber: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
  conditionNotes: string;
}> = [
  {
    name: "Sony FX6 Cinema Camera",
    serialNumber: "FX6-001",
    brand: "Sony",
    model: "FX6",
    category: "CAMERAS",
    conditionNotes: "Primary A-cam with cage and top handle.",
  },
  {
    name: "Canon XF605",
    serialNumber: "XF605-014",
    brand: "Canon",
    model: "XF605",
    category: "CAMERAS",
    conditionNotes: "IMAG camera, includes battery pack.",
  },
  {
    name: "Shure SM58 Vocal Mic",
    serialNumber: "SM58-203",
    brand: "Shure",
    model: "SM58",
    category: "AUDIO",
    conditionNotes: "Handheld vocal, clip included.",
  },
  {
    name: "Yamaha QL1 Mixer",
    serialNumber: "QL1-008",
    brand: "Yamaha",
    model: "QL1",
    category: "AUDIO",
    conditionNotes: "FOH console, scene 1 locked.",
  },
  {
    name: "HDMI 50ft Cable",
    serialNumber: "HDMI-50-11",
    brand: "G-Tech",
    model: "Pro 50",
    category: "CABLES",
    conditionNotes: "Labeled both ends.",
  },
  {
    name: "Atomos Ninja V",
    serialNumber: "NJV-441",
    brand: "Atomos",
    model: "Ninja V",
    category: "DISPLAYS",
    conditionNotes: "Monitor/recorder with SSD sled.",
  },
  {
    name: "Aputure 600d Pro",
    serialNumber: "AP600-019",
    brand: "Aputure",
    model: "600d Pro",
    category: "LIGHTING",
    conditionNotes: "Includes Bowens reflector and case.",
  },
  {
    name: "Mac Mini M2",
    serialNumber: "MM2-PRO-07",
    brand: "Apple",
    model: "Mac Mini M2",
    category: "COMPUTING",
    conditionNotes: "Playback machine, ProPresenter installed.",
  },
  {
    name: "Manfrotto 504X Tripod",
    serialNumber: "MF-504X-22",
    brand: "Manfrotto",
    model: "504X",
    category: "OTHERS",
    conditionNotes: "Fluid head, mid-level spreader, labeled legs.",
  },
  {
    name: "Blackmagic ATEM Mini Extreme",
    serialNumber: "ATEM-EXT-03",
    brand: "Blackmagic",
    model: "ATEM Mini Extreme",
    category: "COMPUTING",
    conditionNotes: "Switching and ISO record, USB-C capture to playback Mac.",
  },
];

export async function seedSampleKit() {
  const session = await requireSession();
  const existing = await prisma.equipment.count({ where: { orgId: session.orgId } });
  if (existing > 0) {
    return { error: "Sample kit is only available on an empty inventory" };
  }

  await prisma.equipment.createMany({
    data: SAMPLE_KIT.map((item) => ({
      ...item,
      orgId: session.orgId,
      locationLabel: "Storage / cage",
    })),
  });
  await prisma.activity.create({
    data: {
      orgId: session.orgId,
      userId: session.userId,
      action: "SAMPLE_SEEDED",
      details: { count: SAMPLE_KIT.length },
    },
  });
  revalidatePath("/workspace");
  revalidatePath("/admin");
  revalidatePath("/admin/equipment");
  revalidatePath("/admin/history");
  return { ok: true, count: SAMPLE_KIT.length };
}

export async function changePassword(input: unknown) {
  const session = await requireSession();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password details" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { error: "User not found" };
  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) return { error: "Current password is incorrect" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { ok: true };
}
