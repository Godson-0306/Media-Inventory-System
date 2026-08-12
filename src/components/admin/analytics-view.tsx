"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Counts, EquipmentDTO } from "@/lib/types";

const STATUS_COLORS = {
  AVAILABLE: "#34d399",
  IN_USE: "#fbbf24",
  FAULTY: "#f87171",
  RENTED_OUT: "#60a5fa",
};

export function AnalyticsView({
  counts,
  mostUsed,
  categoryBreakdown,
  statusBreakdown,
}: {
  counts: Counts;
  mostUsed: EquipmentDTO[];
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}) {
  const categoryData = CATEGORIES.map((item) => ({
    name: item.label,
    value: categoryBreakdown[item.value] ?? 0,
  })).filter((item) => item.value > 0);

  const statusData = Object.entries(statusBreakdown).map(([name, value]) => ({
    name: name.replace("_", " "),
    value,
    key: name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Protected operational management for high-trust workflows.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Total Equipment" value={counts.total} />
        <Kpi label="Available" value={counts.available} tone="ok" />
        <Kpi label="In-Use" value={counts.inUse} tone="warn" />
        <Kpi label="Faulty" value={counts.faulty} tone="bad" />
        <Kpi label="Rentals In" value={counts.rentalsIn} />
        <Kpi label="Rentals Out" value={counts.rentalsOut} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Category breakdown</h2>
          {categoryData.length === 0 ? (
            <EmptyState
              title="No chart data yet"
              description="Add equipment to see category and usage analytics."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Status mix</h2>
          {counts.total === 0 ? (
            <EmptyState
              title="No status mix"
              description="Inventory status will appear here after assets are created."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key as keyof typeof STATUS_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
      <Card className="p-4">
        <h2 className="mb-4 font-medium">Most used equipment</h2>
        {mostUsed.length === 0 ? (
          <EmptyState
            title="No usage yet"
            description="Sign-outs increment usage so operators can see which kits work the hardest."
          />
        ) : (
          <div className="space-y-2">
            {mostUsed.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.serialNumber}</p>
                </div>
                <p className="text-sm text-primary">{item.useCount} uses</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <Card
      className={cn(
        "p-4",
        tone === "ok" && "bg-emerald-500/5",
        tone === "warn" && "bg-amber-500/5",
        tone === "bad" && "bg-red-500/10",
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
