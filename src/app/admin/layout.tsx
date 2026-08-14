import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/authz";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireOwnerPage();

  const [openFaults, pendingRequests] = await Promise.all([
    prisma.fault.count({
      where: { orgId: session.orgId, status: { not: "RESOLVED" } },
    }),
    prisma.operationRequest.count({
      where: { orgId: session.orgId, status: "PENDING" },
    }),
  ]);

  return (
    <AdminShell
      orgName={session.orgName}
      userName={session.name}
      openFaults={openFaults}
      pendingRequests={pendingRequests}
    >
      {children}
    </AdminShell>
  );
}
