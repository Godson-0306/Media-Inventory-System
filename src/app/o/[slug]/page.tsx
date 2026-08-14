import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OrgAccent } from "@/components/brand/org-accent";
import { resolveBranding } from "@/lib/org";

export const dynamic = "force-dynamic";

export default async function OrgLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) notFound();
  const branding = resolveBranding(org);

  return (
    <OrgAccent branding={branding}>
      <main className="min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_32%)]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Logo src={branding?.logoUrl} alt={org.name} />
              <div>
                <p className="font-semibold">
                  {branding?.loginHeadline || branding?.brandName || org.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {branding?.loginTagline || "Sign in to this company workspace."}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <AuthPanel orgSlug={org.slug} loginOnly />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Joining as staff?{" "}
            <Link href="/join" className="text-primary hover:underline">
              Use a join code
            </Link>
          </p>
        </div>
      </main>
    </OrgAccent>
  );
}
