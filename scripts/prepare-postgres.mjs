import { PrismaClient } from "@prisma/client";

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;

const prisma = new PrismaClient(
  url ? { datasources: { db: { url } } } : undefined,
);

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF'`,
    );
    console.log("Ensured UserRole includes STAFF");
  } catch (error) {
    console.warn(
      "Could not add STAFF to UserRole:",
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "User" SET role = 'STAFF' WHERE role::text = 'OPERATOR'`,
    );
    console.log("Renamed OPERATOR roles to STAFF:", updated);
  } catch (error) {
    console.warn(
      "Could not rename OPERATOR roles:",
      error instanceof Error ? error.message : error,
    );
  }
}

main()
  .catch((error) => {
    console.warn(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
