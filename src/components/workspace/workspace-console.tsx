"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Search, Shield } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { signOutEquipment, signInEquipment } from "@/actions/operations";
import { LiveTracker } from "@/components/maps/live-tracker";
import { PlacePicker } from "@/components/maps/place-picker";
import { useRefreshWhile } from "@/hooks/use-refresh-while";
import { CATEGORIES } from "@/lib/constants";
import { cn, formatRelativeTime, requestTypeLabel, statusLabel } from "@/lib/utils";
import type { EquipmentDTO, OperationRequestDTO, PlaceHit } from "@/lib/types";

type Props = {
  orgName: string;
  userName: string;
  userId: string;
  role: "OWNER" | "STAFF";
  logoUrl?: string | null;
  equipment: EquipmentDTO[];
  pendingRequests: OperationRequestDTO[];
};

export function WorkspaceConsole({
  orgName,
  userName,
  userId,
  role,
  logoUrl,
  equipment,
  pendingRequests,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState("name");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [destination, setDestination] = useState<PlaceHit | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [isXl, setIsXl] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsXl(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const pendingByEquipment = useMemo(() => {
    const map = new Map<string, OperationRequestDTO>();
    for (const request of pendingRequests) {
      if (request.status === "PENDING") map.set(request.equipmentId, request);
    }
    return map;
  }, [pendingRequests]);

  function canSelect(item: EquipmentDTO) {
    return (
      (item.status === "ACTIVE" || item.status === "SIGNED_IN") &&
      !pendingByEquipment.has(item.id)
    );
  }

  const selectedItems = useMemo(
    () => equipment.filter((item) => selectedIds.includes(item.id) && canSelect(item)),
    [equipment, selectedIds, pendingByEquipment],
  );
  const signOutEligible = selectedItems;

  useRefreshWhile(
    equipment.some((item) => item.status === "SIGNED_OUT") ||
      pendingRequests.some((item) => item.status === "PENDING"),
  );

  const filtered = useMemo(() => {
    const list = equipment.filter((item) => {
      const haystack = `${item.name} ${item.serialNumber} ${item.brand} ${item.model}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesCategory = category === "ALL" || item.category === category;
      return matchesQuery && matchesCategory;
    });
    return list.sort((a, b) => {
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "serial") return a.serialNumber.localeCompare(b.serialNumber);
      return a.name.localeCompare(b.name);
    });
  }, [category, equipment, query, sort]);

  const available = filtered.filter((item) => item.status !== "SIGNED_OUT");
  const signedOut = filtered.filter((item) => item.status === "SIGNED_OUT");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function toggleSelected(id: string) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item || !canSelect(item)) return;
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function requestSignOut() {
    if (!destination || signOutEligible.length === 0) return;
    startTransition(async () => {
      const result = await signOutEquipment({
        equipmentIds: signOutEligible.map((item) => item.id),
        operatorUserId: userId,
        locationLabel: destination.label,
        locationAddress: destination.address,
        latitude: destination.latitude,
        longitude: destination.longitude,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const sent = result.sent ?? signOutEligible.length;
      const skipped = result.skipped ?? 0;
      toast.success(
        skipped > 0
          ? `${sent} sign-out request${sent === 1 ? "" : "s"} sent, ${skipped} skipped`
          : `${sent} sign-out request${sent === 1 ? "" : "s"} sent`,
      );
      setDestination(null);
      setSelectedIds([]);
      setSignOutOpen(false);
    });
  }

  function requestSignIn(equipmentId: string) {
    startTransition(async () => {
      const result = await signInEquipment({
        equipmentId,
        operatorUserId: userId,
      });
      if (result.error) toast.error(result.error);
      else toast.success("Sign-in request sent. Keep this tab open until admin accepts.");
    });
  }

  const signOutBody = signOutEligible.length > 0 ? (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {signOutEligible.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-11 rounded-full border border-border bg-background px-3 py-2 text-sm"
            onClick={() => toggleSelected(item.id)}
          >
            {item.name} ×
          </button>
        ))}
      </div>
      <PlacePicker compact={!isXl} value={destination} onChange={setDestination} />
    </div>
  ) : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <LiveTracker userId={userId} equipment={equipment} />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3" title={userName}>
            <Logo src={logoUrl} alt={orgName} />
            <p className="truncate font-semibold">{orgName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {role === "OWNER" ? (
              <Button variant="outline" onClick={() => router.push("/admin")}>
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            ) : null}
            <Button variant="outline" onClick={logout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 p-4 pb-28 xl:grid-cols-[minmax(0,1fr)_380px] xl:p-6 xl:pb-6">
        <Card className="flex flex-col p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search"
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
            <Select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="status">Sort: Status</option>
              <option value="serial">Sort: Serial</option>
            </Select>
          </div>
          {available.some(canSelect) ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedIds(available.filter(canSelect).map((item) => item.id))}
              >
                Select available
              </Button>
              {selectedIds.length > 0 ? (
                <Button type="button" variant="outline" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="flex-1 space-y-5 overflow-auto">
            {filtered.length === 0 ? (
              <EmptyState
                title="No equipment found"
                description="Try a different search or category."
              />
            ) : (
              <>
                <EquipmentGroup title="Available" count={available.length}>
                  {available.map((item) => (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      userId={userId}
                      pendingRequest={pendingByEquipment.get(item.id)}
                      selectable={canSelect(item)}
                      selected={canSelect(item) && selectedIds.includes(item.id)}
                      pending={pending}
                      onToggle={() => toggleSelected(item.id)}
                      onSignIn={() => requestSignIn(item.id)}
                    />
                  ))}
                </EquipmentGroup>
                <EquipmentGroup title="Signed out" count={signedOut.length}>
                  {signedOut.map((item) => (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      userId={userId}
                      pendingRequest={pendingByEquipment.get(item.id)}
                      selectable={false}
                      selected={false}
                      pending={pending}
                      onToggle={() => undefined}
                      onSignIn={() => requestSignIn(item.id)}
                    />
                  ))}
                </EquipmentGroup>
              </>
            )}
          </div>
        </Card>

        <Card className="hidden p-4 xl:block">
          <h2 className="font-semibold">Sign out</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select available kit, pin the job, then send a request.
          </p>
          <div className="mt-4 space-y-4">
            {signOutEligible.length > 0 ? (
              <>
                {signOutBody}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={pending || !destination}
                  onClick={requestSignOut}
                >
                  Request sign out
                  {signOutEligible.length > 1 ? ` (${signOutEligible.length})` : ""}
                </Button>
              </>
            ) : (
              <EmptyState
                title="Select kit to sign out"
                description="Signed-out equipment cannot be selected. If you have kit out, use Sign in on that row."
              />
            )}
          </div>
        </Card>
      </div>

      {!isXl && signOutEligible.length > 0 && !signOutOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
          <Button className="w-full" size="lg" onClick={() => setSignOutOpen(true)}>
            Proceed to sign out
            {signOutEligible.length > 1 ? ` (${signOutEligible.length})` : ""}
          </Button>
        </div>
      ) : null}

      {!isXl && signOutOpen && signOutEligible.length > 0 ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="font-semibold">Sign out</p>
              <p className="text-sm text-muted-foreground">
                {signOutEligible.length} selected · pin the job
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setSignOutOpen(false)}>
              Close
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{signOutBody}</div>
          <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="w-full"
              size="lg"
              disabled={pending || !destination}
              onClick={requestSignOut}
            >
              Request sign out
              {signOutEligible.length > 1 ? ` (${signOutEligible.length})` : ""}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EquipmentGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EquipmentRow({
  item,
  userId,
  pendingRequest,
  selectable,
  selected,
  pending,
  onToggle,
  onSignIn,
}: {
  item: EquipmentDTO;
  userId: string;
  pendingRequest?: OperationRequestDTO;
  selectable: boolean;
  selected: boolean;
  pending: boolean;
  onToggle: () => void;
  onSignIn: () => void;
}) {
  const isHolder = item.status === "SIGNED_OUT" && item.signedOutByUserId === userId;
  const signInPending = pendingRequest?.type === "SIGN_IN";

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-3",
        selected
          ? "border-primary bg-primary/10"
          : selectable
            ? "border-border"
            : "border-border bg-muted/20",
      )}
    >
      {selectable ? (
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
          onClick={onToggle}
          aria-pressed={selected}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40",
            )}
            aria-hidden
          >
            {selected ? "✓" : ""}
          </span>
          <KitMeta item={item} pendingRequest={pendingRequest} />
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <KitMeta item={item} pendingRequest={pendingRequest} />
        </div>
      )}
      {isHolder ? (
        <Button
          type="button"
          variant={signInPending ? "outline" : "default"}
          disabled={pending || signInPending}
          onClick={onSignIn}
        >
          {signInPending ? "Requested" : "Sign in"}
        </Button>
      ) : null}
    </div>
  );
}

function KitMeta({
  item,
  pendingRequest,
}: {
  item: EquipmentDTO;
  pendingRequest?: OperationRequestDTO;
}) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-2">
        <p className="truncate text-base font-medium">{item.name}</p>
        <StatusChip status={item.status} />
      </span>
      {pendingRequest ? (
        <p className="text-xs text-muted-foreground">
          {requestTypeLabel(pendingRequest.type)} requested
        </p>
      ) : item.status === "SIGNED_OUT" && item.liveUpdatedAt ? (
        <p className="text-xs text-muted-foreground">
          Live · {formatRelativeTime(item.liveUpdatedAt)}
        </p>
      ) : item.locationLabel ? (
        <p className="truncate text-xs text-muted-foreground">{item.locationLabel}</p>
      ) : null}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "SIGNED_OUT"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : status === "FAULTY"
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
