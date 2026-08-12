import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let database = "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch {
    database = "unavailable";
  }

  return NextResponse.json({
    ok: true,
    service: "asset-operations-platform",
    database,
  });
}
