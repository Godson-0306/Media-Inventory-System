import { prisma } from "@/lib/db";

export async function resolveOrgMember(orgId: string, operatorUserId: string) {
  const member = await prisma.user.findFirst({
    where: { id: operatorUserId, orgId, status: "ACTIVE" },
  });
  if (!member) {
    return { error: "Select a member of this organization", member: null };
  }
  return { error: null, member };
}
