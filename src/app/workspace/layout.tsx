import type { ReactNode } from "react";
import { requireActiveOrgPage } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireActiveOrgPage();
  return children;
}
