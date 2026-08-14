"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { actionLabel, formatDateTime } from "@/lib/utils";
import type { ActivityDTO } from "@/lib/types";

export function HistoryView({ activities }: { activities: ActivityDTO[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return activities.filter((item) =>
      `${item.action} ${item.equipmentName ?? ""} ${item.userName ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [activities, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">History</h1>
        <p className="text-sm text-muted-foreground">
          Protected operational management for high-trust workflows.
        </p>
      </div>
      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-medium">Operational history</h2>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Filter history..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="sm:w-64"
            />
            <span className="text-sm text-muted-foreground">{filtered.length} Records</span>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No history found"
            description="Sign-outs, returns, rentals, repairs, and staff joins will appear here as an attributed audit trail."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-3">
                <p className="text-sm font-medium">{actionLabel(item.action)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.equipmentName ?? "Workspace"} · {item.userName ?? "System"} ·{" "}
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
