import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { toOperationRequestDTO } from "@/lib/mappers";
import { RequestsAdmin } from "@/components/admin/requests-admin";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);
  return <RequestsAdmin requests={data.operationRequests.map(toOperationRequestDTO)} />;
}
