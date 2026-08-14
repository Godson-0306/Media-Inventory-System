import { requireOwnerPage } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { hasCustomInterface } from "@/lib/plans";
import { resolveBranding } from "@/lib/org";
import { AppearanceAdmin } from "@/components/admin/appearance-admin";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const session = await requireOwnerPage();
  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return null;

  return (
    <AppearanceAdmin
      locked={!hasCustomInterface(org.plan)}
      orgName={org.name}
      loginPath={`/o/${org.slug}`}
      branding={resolveBranding(org) ?? {
        brandName: org.brandName,
        logoUrl: org.logoUrl,
        accentColor: org.accentColor,
        loginHeadline: org.loginHeadline,
        loginTagline: org.loginTagline,
      }}
    />
  );
}
