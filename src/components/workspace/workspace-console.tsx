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
            className="min-h-11 max-w-full break-words rounded-full border border-border bg-background px-3 py-2 text-left text-sm [overflow-wrap:anywhere]"
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
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2" title={userName}>
            <Logo src={logoUrl} alt={orgName} className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <p className="min-w-0 truncate font-semibold" title={orgName}>
              {orgName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle className="h-10 w-10" />
            {role === "OWNER" ? (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => router.push("/admin")}
                aria-label="Admin"
              >
                <Shield className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 p-3 pb-28 sm:p-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:p-6 xl:pb-6">
        <Card className="flex min-w-0 flex-col p-3 sm:p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mb-3 grid min-w-0 grid-cols-2 gap-2">
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
        "flex w-full min-w-0 items-start gap-3 rounded-xl border px-3 py-3",
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
          className="flex min-h-11 min-w-0 flex-1 items-start gap-3 text-left"
          onClick={onToggle}
          aria-pressed={selected}
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs",
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
          className="shrink-0"
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
  const detail = pendingRequest
    ? `${requestTypeLabel(pendingRequest.type)} requested`
    : item.status === "SIGNED_OUT" && item.liveUpdatedAt
      ? `Live · ${formatRelativeTime(item.liveUpdatedAt)}`
      : item.locationLabel || null;

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="break-words text-base font-medium leading-snug [overflow-wrap:anywhere]">
        {item.name}
      </p>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <StatusChip status={item.status} />
        {detail ? (
          <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
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
