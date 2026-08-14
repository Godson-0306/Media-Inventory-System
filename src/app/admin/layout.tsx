import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/authz";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrgAccent } from "@/components/brand/org-accent";

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
    <OrgAccent branding={session.branding}>
    <AdminShell
      orgName={session.orgName}
      userName={session.name}
      logoUrl={session.branding?.logoUrl}
      openFaults={openFaults}
      pendingRequests={pendingRequests}
    >
      {children}
    </AdminShell>
    </OrgAccent>
  );
}
