"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateFaultStatus } from "@/actions/faults";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { FaultDTO } from "@/lib/types";

export function FaultsAdmin({ faults }: { faults: FaultDTO[] }) {
  const [pending, startTransition] = useTransition();
  const open = faults.filter((item) => item.status !== "RESOLVED");
  const resolved = faults.filter((item) => item.status === "RESOLVED");

  function setStatus(id: string, status: "IN_REPAIR" | "RESOLVED") {
    startTransition(async () => {
      const result = await updateFaultStatus(id, status);
      if (result.error) toast.error(result.error);
      else toast.success(status === "RESOLVED" ? "Fault resolved" : "Marked in repair");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Faulty Queue</h1>
        <p className="text-sm text-muted-foreground">
          Fault reports, repairs, and protected admin handling stay clearly separated from daily operations.
        </p>
      </div>
      <Card className="p-4">
        <h2 className="mb-4 font-medium">Open queue</h2>
        {open.length === 0 ? (
          <EmptyState
            title="No open faults"
            description="When operators report a fault from the workspace, it will land here for repair handling."
          />
        ) : (
          <div className="space-y-3">
            {open.map((item) => (
              <div key={item.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.equipmentName}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.reporterName} · {formatDateTime(item.reportedAt)} · {item.status.replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.status === "OPEN" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setStatus(item.id, "IN_REPAIR")}
                      >
                        Mark in repair
                      </Button>
                    ) : null}
                    <Button size="sm" disabled={pending} onClick={() => setStatus(item.id, "RESOLVED")}>
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {resolved.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                {item.equipmentName} · {item.description}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
