"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveOperationRequest, declineOperationRequest } from "@/actions/requests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime, requestTypeLabel } from "@/lib/utils";
import type { OperationRequestDTO } from "@/lib/types";

export function RequestsAdmin({ requests }: { requests: OperationRequestDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const open = requests.filter((item) => item.status === "PENDING");
  const closed = requests.filter((item) => item.status !== "PENDING");

  function accept(id: string) {
    startTransition(async () => {
      const result = await approveOperationRequest(id);
      if (result.error) toast.error(result.error);
      else toast.success("Request accepted");
    });
  }

  function decline(id: string) {
    startTransition(async () => {
      const result = await declineOperationRequest({
        requestId: id,
        declineReason: reasons[id],
      });
      if (result.error) toast.error(result.error);
      else toast.success("Request declined");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Requests</h1>
        <p className="text-sm text-muted-foreground">
          Accept or decline sign-out, sign-in, and rental requests from the workspace.
        </p>
      </div>
      <Card className="p-4">
        <h2 className="mb-4 font-medium">Pending queue</h2>
        {open.length === 0 ? (
          <EmptyState
            title="No pending requests"
            description="When someone requests a sign-out, sign-in, or rental from the workspace, it will land here."
          />
        ) : (
          <div className="space-y-3">
            {open.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {requestTypeLabel(item.type)} · {item.equipmentName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.serialNumber} · Member {item.operatorName} · Requested by {item.requesterName}
                    </p>
                    {item.locationLabel ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Destination: {item.locationLabel}
                        {item.locationAddress && item.locationAddress !== item.locationLabel
                          ? ` · ${item.locationAddress}`
                          : ""}
                      </p>
                    ) : null}
                    {item.counterparty ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Client or event: {item.counterparty}
                      </p>
                    ) : null}
                    {item.notes ? (
                      <p className="mt-1 text-sm text-muted-foreground">Notes: {item.notes}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex min-w-[220px] flex-col gap-2">
                    <Textarea
                      placeholder="Decline reason (optional)"
                      value={reasons[item.id] ?? ""}
                      onChange={(event) =>
                        setReasons((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={pending} onClick={() => accept(item.id)}>
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => decline(item.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {closed.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Recent decisions</h2>
          <div className="space-y-2">
            {closed.slice(0, 20).map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                {requestTypeLabel(item.type)} · {item.equipmentName} · {item.status.toLowerCase()}
                {item.reviewedByName ? ` · ${item.reviewedByName}` : ""}
                {item.declineReason ? ` · ${item.declineReason}` : ""}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
