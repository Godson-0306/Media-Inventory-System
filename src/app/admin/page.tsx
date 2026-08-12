import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { AnalyticsView } from "@/components/admin/analytics-view";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const data = await getDashboardData(session.orgId);

  return (
    <AnalyticsView
      counts={data.counts}
      categoryBreakdown={data.categoryBreakdown}
      statusBreakdown={data.statusBreakdown}
      mostUsed={data.mostUsed.map((item) => ({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        brand: item.brand,
        model: item.model,
        category: item.category,
        status: item.status,
        currentOperator: item.currentOperator,
        useCount: item.useCount,
        conditionNotes: item.conditionNotes,
      }))}
    />
  );
}
