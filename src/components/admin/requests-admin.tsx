"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { approveOperationRequest, declineOperationRequest } from "@/actions/requests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { cn, formatDateTime, requestTypeLabel } from "@/lib/utils";
import type { OperationRequestDTO } from "@/lib/types";

type Tab = "signOut" | "signIn";

function isSignOutTab(item: OperationRequestDTO) {
  return item.type === "SIGN_OUT" || item.type === "RENTAL_OUT";
}

export function RequestsAdmin({ requests }: { requests: OperationRequestDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("signOut");

  const open = requests.filter((item) => item.status === "PENDING");
  const closed = requests.filter((item) => item.status !== "PENDING");
  const queued = useMemo(
    () =>
      open.filter((item) => (tab === "signOut" ? isSignOutTab(item) : item.type === "SIGN_IN")),
    [open, tab],
  );
  const decided = useMemo(
    () =>
      closed.filter((item) => (tab === "signOut" ? isSignOutTab(item) : item.type === "SIGN_IN")),
    [closed, tab],
  );
  const signOutCount = open.filter(isSignOutTab).length;
  const signInCount = open.filter((item) => item.type === "SIGN_IN").length;

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
          Accept or decline workspace sign-out and sign-in requests.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "signOut" ? "default" : "outline"}
          onClick={() => setTab("signOut")}
        >
          Sign out{signOutCount > 0 ? ` (${signOutCount})` : ""}
        </Button>
        <Button
          type="button"
          variant={tab === "signIn" ? "default" : "outline"}
          onClick={() => setTab("signIn")}
        >
          Sign in{signInCount > 0 ? ` (${signInCount})` : ""}
        </Button>
      </div>
      <Card className="p-4">
        <h2 className="mb-4 font-medium">
          {tab === "signOut" ? "Pending sign-out" : "Pending sign-in"}
        </h2>
        {queued.length === 0 ? (
          <EmptyState
            title={tab === "signOut" ? "No pending sign-out requests" : "No pending sign-in requests"}
            description={
              tab === "signOut"
                ? "When someone requests a sign-out from the workspace, it will land here."
                : "When someone who has kit out requests sign-in, it will land here."
            }
          />
        ) : (
          <div className="space-y-3">
            {queued.map((item) => (
              <div
                key={item.id}
                className={cn("rounded-lg border p-4", "border-amber-500/20 bg-amber-500/5")}
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
      {decided.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Recent decisions</h2>
          <div className="space-y-2">
            {decided.slice(0, 20).map((item) => (
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
