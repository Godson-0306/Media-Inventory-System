import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { HistoryView } from "@/components/admin/history-view";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);

  return (
    <HistoryView
      activities={data.activities.map((item) => ({
        id: item.id,
        action: item.action,
        createdAt: item.createdAt.toISOString(),
        details: (item.details as Record<string, unknown> | null) ?? null,
        userName: item.user?.name ?? null,
        equipmentName: item.equipment?.name ?? null,
      }))}
    />
  );
}
