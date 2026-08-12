import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession, isAdminUnlocked } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { UnlockForm } from "@/components/admin/unlock-form";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  const unlocked = await isAdminUnlocked(session.userId);
  if (!unlocked) {
    return <UnlockForm orgName={session.orgName} />;
  }

  const openFaults = await prisma.fault.count({
    where: { orgId: session.orgId, status: { not: "RESOLVED" } },
  });

  return (
    <AdminShell
      orgName={session.orgName}
      userName={session.name}
      openFaults={openFaults}
    >
      {children}
    </AdminShell>
  );
}
