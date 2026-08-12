"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LogOut,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { IssuePanel } from "@/components/issue-panel";
import { signOutEquipment, returnEquipment, reportFault } from "@/actions/operations";
import { createRental } from "@/actions/rentals";
import { changePassword, seedSampleKit } from "@/actions/settings";
import { CATEGORIES, STATUSES } from "@/lib/constants";
import { actionLabel, cn, formatDateTime } from "@/lib/utils";
import type { ActivityDTO, Counts, EquipmentDTO } from "@/lib/types";

type Props = {
  orgName: string;
  userName: string;
  equipment: EquipmentDTO[];
  activities: ActivityDTO[];
  counts: Counts;
};

export function WorkspaceConsole({
  orgName,
  userName,
  equipment,
  activities,
  counts,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState(userName);
  const [notes, setNotes] = useState("");
  const [faultDescription, setFaultDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const selected = equipment.find((item) => item.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const list = equipment.filter((item) => {
      const haystack = `${item.name} ${item.serialNumber} ${item.brand} ${item.model}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesCategory = category === "ALL" || item.category === category;
      const matchesStatus = status === "ALL" || item.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
    return list.sort((a, b) => {
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "serial") return a.serialNumber.localeCompare(b.serialNumber);
      return a.name.localeCompare(b.name);
    });
  }, [category, equipment, query, sort, status]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function run(action: () => Promise<{ error?: string; ok?: boolean }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      setNotes("");
      setFaultDescription("");
      setCounterparty("");
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-semibold">{orgName} Operations Console</p>
            <p className="text-xs text-muted-foreground">Asset Operations Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/admin")}>
            <Shield className="h-4 w-4" />
            Admin dashboard
          </Button>
          <div className="relative">
            <Button variant="outline" onClick={() => setSettingsOpen((value) => !value)}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            {settingsOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl">
                <p className="text-sm font-medium">Organization</p>
                <p className="mb-3 text-sm text-muted-foreground">{orgName}</p>
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      () => changePassword({ currentPassword, newPassword }),
                      "Password updated",
                    );
                    setCurrentPassword("");
                    setNewPassword("");
                  }}
                >
                  <Input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <Button className="w-full" size="sm" disabled={pending}>
                    Change password
                  </Button>
                </form>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  size="sm"
                  disabled={pending || equipment.length > 0}
                  onClick={() =>
                    run(() => seedSampleKit(), "Sample production kit loaded")
                  }
                >
                  Load sample production kit
                </Button>
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {userName.slice(0, 1).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)_260px_280px] xl:p-6">
        <Card className="flex min-h-[70vh] flex-col p-4">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">Owned Equipment</h2>
              <p className="text-xs text-muted-foreground">
                {counts.total} serialized assets
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
              Live
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search equipment..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="ALL">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All status</option>
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <Select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
            <option value="serial">Sort: Serial</option>
          </Select>
          <div className="mt-4 flex-1 space-y-2 overflow-auto">
            {filtered.length === 0 ? (
              <EmptyState
                title="No equipment found"
                description="Try a different search, filter, or add equipment from the admin dashboard."
              />
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left",
                    selectedId === item.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.serialNumber} · {item.status.replace("_", " ")}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Total" value={counts.total} />
            <Metric label="Available" value={counts.available} tone="ok" />
            <Metric label="In-use" value={counts.inUse} tone="warn" />
            <Metric label="Faulty" value={counts.faulty} tone="bad" />
          </div>
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Operational workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select equipment, capture operator attribution, and move assets through the day.
            </p>
            {!selected ? (
              <EmptyState
                className="mt-6"
                title="Select an equipment item"
                description="Choose an asset from the inventory to continue operational handling."
              />
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="font-medium">{selected.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selected.brand} {selected.model} · {selected.serialNumber}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-primary">
                    {selected.status.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="operator">Operator attribution</Label>
                  <Input
                    id="operator"
                    value={operatorName}
                    onChange={(event) => setOperatorName(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.status === "AVAILABLE" ? (
                    <Button
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            signOutEquipment({
                              equipmentId: selected.id,
                              operatorName,
                              notes,
                            }),
                          "Asset signed out",
                        )
                      }
                    >
                      Sign out
                    </Button>
                  ) : null}
                  {selected.status === "IN_USE" || selected.status === "RENTED_OUT" ? (
                    <Button
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            returnEquipment({
                              equipmentId: selected.id,
                              operatorName,
                              notes,
                            }),
                          "Asset returned",
                        )
                      }
                    >
                      Return
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <Label htmlFor="fault">Report fault</Label>
                    <Textarea
                      id="fault"
                      value={faultDescription}
                      onChange={(event) => setFaultDescription(event.target.value)}
                    />
                    <Button
                      className="mt-2 w-full"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            reportFault({
                              equipmentId: selected.id,
                              operatorName,
                              description: faultDescription,
                            }),
                          "Fault reported",
                        )
                      }
                    >
                      Report fault
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <Label htmlFor="rental">Send on rental</Label>
                    <Input
                      id="rental"
                      placeholder="Client or event"
                      value={counterparty}
                      onChange={(event) => setCounterparty(event.target.value)}
                    />
                    <Button
                      className="mt-2 w-full"
                      variant="outline"
                      size="sm"
                      disabled={pending || selected.status !== "AVAILABLE"}
                      onClick={() =>
                        run(
                          () =>
                            createRental({
                              equipmentId: selected.id,
                              type: "OUT",
                              counterparty,
                              startDate: new Date().toISOString(),
                              notes,
                            }),
                          "Rental created",
                        )
                      }
                    >
                      Send out
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="font-semibold">Workspace guardrails</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p className="rounded-lg border border-border bg-muted/20 p-3">
              Organization login isolates inventory and operations.
            </p>
            <p className="rounded-lg border border-border bg-muted/20 p-3">
              Admin unlock is always separate and temporary.
            </p>
            <p className="rounded-lg border border-border bg-muted/20 p-3">
              Every sign-out, return, rental, repair, and fault is attributed.
            </p>
          </div>
          <div className="mt-6 rounded-xl bg-primary/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Admin access
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Inventory edits, rentals management, analytics, and the full fault queue live behind a protected unlock screen.
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push("/admin")}>
              <Shield className="h-4 w-4" />
              Open protected admin
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Recent activity</h2>
          <p className="text-xs text-muted-foreground">
            Lightweight operational feed for the current workspace.
          </p>
          <div className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="The feed will populate as your organization starts working with equipment."
              />
            ) : (
              activities.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium">{actionLabel(item.action)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.equipmentName ?? "Workspace"} · {item.userName ?? "System"} ·{" "}
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <IssuePanel
        issues={
          counts.openFaults > 0
            ? [
                {
                  id: "open-faults",
                  title: `${counts.openFaults} open fault${counts.openFaults === 1 ? "" : "s"}`,
                  detail: "Review the Faulty Queue in the protected admin dashboard.",
                },
              ]
            : []
        }
      />
    </div>
  );
}

function Metric({
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
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
