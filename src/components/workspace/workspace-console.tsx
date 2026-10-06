"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Cable,
  Camera,
  Headphones,
  Lamp,
  Laptop,
  Layers,
  LogOut,
  MapPin,
  Monitor,
  Package,
  Search,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
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
import {
  CATEGORIES,
  LIVE_LOCATION_FRESH_MS,
  LIVE_LOCATION_STALE_MS,
} from "@/lib/constants";
import {
  cn,
  formatSinceWeekday,
  getLocationFreshness,
  holderFirstName,
  isLocationStale,
  requestTypeLabel,
} from "@/lib/utils";
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

type SelectionScope = "available" | "withMe";

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
  const [staleOnly, setStaleOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [destination, setDestination] = useState<PlaceHit | null>(null);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [isXl, setIsXl] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsXl(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFilterOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  const pendingByEquipment = useMemo(() => {
    const map = new Map<string, OperationRequestDTO>();
    for (const request of pendingRequests) {
      if (request.status === "PENDING") map.set(request.equipmentId, request);
    }
    return map;
  }, [pendingRequests]);

  function canSelectAvailable(item: EquipmentDTO) {
    return (
      (item.status === "ACTIVE" || item.status === "SIGNED_IN") &&
      !pendingByEquipment.has(item.id)
    );
  }

  function canSelectWithMe(item: EquipmentDTO) {
    return (
      item.status === "SIGNED_OUT" &&
      item.signedOutByUserId === userId &&
      pendingByEquipment.get(item.id)?.type !== "SIGN_IN"
    );
  }

  useRefreshWhile(
    equipment.some((item) => item.status === "SIGNED_OUT") ||
      pendingRequests.some((item) => item.status === "PENDING"),
  );

  const filtered = useMemo(() => {
    const list = equipment.filter((item) => {
      const haystack = `${item.name} ${item.serialNumber} ${item.brand} ${item.model}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesCategory = category === "ALL" || item.category === category;
      const matchesStale =
        !staleOnly || isLocationStale(item.liveUpdatedAt, LIVE_LOCATION_STALE_MS);
      return matchesQuery && matchesCategory && matchesStale;
    });
    return list.sort((a, b) => {
      if (sort === "stale") {
        const aStale = isLocationStale(a.liveUpdatedAt, LIVE_LOCATION_STALE_MS) ? 0 : 1;
        const bStale = isLocationStale(b.liveUpdatedAt, LIVE_LOCATION_STALE_MS) ? 0 : 1;
        if (aStale !== bStale) return aStale - bStale;
      }
      if (sort === "serial") return a.serialNumber.localeCompare(b.serialNumber);
      return a.name.localeCompare(b.name);
    });
  }, [category, equipment, query, sort, staleOnly]);

  const withMe = filtered.filter(
    (item) => item.status === "SIGNED_OUT" && item.signedOutByUserId === userId,
  );
  const available = filtered.filter((item) => item.status !== "SIGNED_OUT");
  const withOthers = filtered.filter(
    (item) => item.status === "SIGNED_OUT" && item.signedOutByUserId !== userId,
  );

  const availableIds = useMemo(() => new Set(available.map((item) => item.id)), [available]);
  const withMeIds = useMemo(() => new Set(withMe.map((item) => item.id)), [withMe]);

  const checkoutSelected = useMemo(
    () =>
      equipment.filter(
        (item) => selectedIds.includes(item.id) && canSelectAvailable(item),
      ),
    [equipment, selectedIds, pendingByEquipment],
  );
  const returnSelected = useMemo(
    () =>
      equipment.filter((item) => selectedIds.includes(item.id) && canSelectWithMe(item)),
    [equipment, selectedIds, pendingByEquipment, userId],
  );
  const returnableWithMe = withMe.filter(canSelectWithMe);
  const filtersActive = category !== "ALL" || sort !== "name" || staleOnly;
  const actionBarVisible = checkoutSelected.length > 0 || returnSelected.length > 0;

  useEffect(() => {
    if (checkoutSelected.length === 0) setCheckOutOpen(false);
  }, [checkoutSelected.length]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function toggleSelected(id: string, scope: SelectionScope) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item) return;
    if (scope === "available" && !canSelectAvailable(item)) return;
    if (scope === "withMe" && !canSelectWithMe(item)) return;

    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      const allowed = scope === "available" ? availableIds : withMeIds;
      const next = current.filter((value) => allowed.has(value));
      return [...next, id];
    });
  }

  function selectAllAvailable() {
    setSelectedIds(available.filter(canSelectAvailable).map((item) => item.id));
  }

  async function requestCheckOut() {
    if (!destination || checkoutSelected.length === 0) return;
    startTransition(async () => {
      const result = await signOutEquipment({
        equipmentIds: checkoutSelected.map((item) => item.id),
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
      const sent = result.sent ?? checkoutSelected.length;
      const skipped = result.skipped ?? 0;
      toast.success(
        skipped > 0
          ? `${sent} check-out request${sent === 1 ? "" : "s"} sent, ${skipped} skipped`
          : `${sent} check-out request${sent === 1 ? "" : "s"} sent`,
      );
      setDestination(null);
      setSelectedIds([]);
      setCheckOutOpen(false);
    });
  }

  function requestReturn(ids: string[]) {
    if (ids.length === 0) return;
    startTransition(async () => {
      let sent = 0;
      let lastError: string | null = null;
      for (const equipmentId of ids) {
        const result = await signInEquipment({
          equipmentId,
          operatorUserId: userId,
        });
        if (result.error) lastError = result.error;
        else sent += 1;
      }
      if (sent === 0 && lastError) {
        toast.error(lastError);
        return;
      }
      toast.success(
        `${sent} return request${sent === 1 ? "" : "s"} sent. Keep this tab open until admin accepts.`,
      );
      if (lastError) toast.error(lastError);
      setSelectedIds([]);
    });
  }

  function onPrimaryAction() {
    if (returnSelected.length > 0) {
      requestReturn(returnSelected.map((item) => item.id));
      return;
    }
    if (checkoutSelected.length === 0) return;
    if (isXl) {
      if (!destination) {
        toast.error("Pin the job destination, then check out.");
        return;
      }
      void requestCheckOut();
      return;
    }
    setCheckOutOpen(true);
  }

  const checkOutBody = checkoutSelected.length > 0 ? (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {checkoutSelected.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-11 max-w-full break-words rounded-full border border-border bg-background px-3 py-2 text-left text-sm [overflow-wrap:anywhere]"
            onClick={() => toggleSelected(item.id, "available")}
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
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-2 py-2 backdrop-blur sm:px-4 sm:py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Logo src={logoUrl} alt={orgName} className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search equipment"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button
              type="button"
              variant="outline"
              className="relative h-11 min-w-11 px-2 sm:px-3"
              onClick={() => setFilterOpen(true)}
              aria-label="Filter"
              aria-expanded={filterOpen}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
              {filtersActive ? (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              {filtersActive ? <span className="sr-only">Filters active</span> : null}
            </Button>
            <ThemeToggle className="h-11 w-11" />
            {role === "OWNER" ? (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => router.push("/admin")}
                aria-label="Admin"
              >
                <Shield className="h-4 w-4" />
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "grid min-w-0 gap-4 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:p-6",
          actionBarVisible ? "pb-40 xl:pb-40" : "pb-24 xl:pb-24",
        )}
      >
        <Card className="flex min-w-0 flex-col p-3 sm:p-4">
          <p className="sr-only" title={userName}>
            Signed in as {userName}
          </p>
          <div className="flex-1 space-y-5 overflow-auto">
            {filtered.length === 0 ? (
              <EmptyState
                title="No equipment found"
                description="Try a different search or filter."
              />
            ) : (
              <>
                <EquipmentGroup
                  title="With me"
                  count={withMe.length}
                  action={
                    returnableWithMe.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-xs"
                        disabled={pending}
                        onClick={() => requestReturn(returnableWithMe.map((item) => item.id))}
                      >
                        Return all
                      </Button>
                    ) : null
                  }
                >
                  {withMe.map((item) => (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      userId={userId}
                      pendingRequest={pendingByEquipment.get(item.id)}
                      selectable={canSelectWithMe(item)}
                      selected={canSelectWithMe(item) && selectedIds.includes(item.id)}
                      variant="withMe"
                      onToggle={() => toggleSelected(item.id, "withMe")}
                    />
                  ))}
                </EquipmentGroup>
                <EquipmentGroup
                  title="Available"
                  count={available.length}
                  action={
                    available.some(canSelectAvailable) ? (
                      <button
                        type="button"
                        className="min-h-9 rounded-md px-2 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={selectAllAvailable}
                      >
                        Select all
                      </button>
                    ) : null
                  }
                >
                  {available.map((item) => (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      userId={userId}
                      pendingRequest={pendingByEquipment.get(item.id)}
                      selectable={canSelectAvailable(item)}
                      selected={canSelectAvailable(item) && selectedIds.includes(item.id)}
                      variant="available"
                      onToggle={() => toggleSelected(item.id, "available")}
                    />
                  ))}
                </EquipmentGroup>
                <EquipmentGroup
                  title="With others"
                  count={withOthers.length}
                  collapsible
                  expanded={othersOpen}
                  onToggle={() => setOthersOpen((open) => !open)}
                >
                  {withOthers.map((item) => (
                    <EquipmentRow
                      key={item.id}
                      item={item}
                      userId={userId}
                      pendingRequest={pendingByEquipment.get(item.id)}
                      selectable={false}
                      selected={false}
                      variant="withOthers"
                      onToggle={() => undefined}
                    />
                  ))}
                </EquipmentGroup>
              </>
            )}
          </div>
        </Card>

        <Card className="hidden p-4 xl:block">
          <h2 className="font-semibold">Check out</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select available kit, pin the job, then send a request.
          </p>
          <div className="mt-4 space-y-4">
            {checkoutSelected.length > 0 ? (
              checkOutBody
            ) : returnSelected.length > 0 ? (
              <EmptyState
                title="Return selected kit"
                description="Use Return in the bar below. Mixed check-out and return selections are not allowed."
              />
            ) : (
              <EmptyState
                title="Select kit to check out"
                description="Kit with others cannot be selected. Items with you can be returned from the list."
              />
            )}
          </div>
        </Card>
      </div>

      {actionBarVisible && !checkOutOpen ? (
        <div className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-background/95 p-2 shadow-2xl sm:inset-x-4">
          <Button
            className="w-full"
            size="lg"
            disabled={pending}
            onClick={onPrimaryAction}
          >
            {returnSelected.length > 0
              ? `Return (${returnSelected.length})`
              : `Check out (${checkoutSelected.length})`}
          </Button>
        </div>
      ) : null}

      {!isXl && checkOutOpen && checkoutSelected.length > 0 ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="font-semibold">Check out</p>
              <p className="text-sm text-muted-foreground">
                {checkoutSelected.length} selected · pin the job
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setCheckOutOpen(false)}>
              Close
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{checkOutBody}</div>
          <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="w-full"
              size="lg"
              disabled={pending || !destination}
              onClick={requestCheckOut}
            >
              Request check out
              {checkoutSelected.length > 1 ? ` (${checkoutSelected.length})` : ""}
            </Button>
          </div>
        </div>
      ) : null}

      {filterOpen ? (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close filters"
            onClick={() => setFilterOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-sheet-title"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-4 sm:w-[380px] sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="filter-sheet-title" className="font-semibold">
                Filter
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setFilterOpen(false)}>
                Done
              </Button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Category</span>
                <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="ALL">All categories</option>
                  {CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Sort</span>
                <Select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="name">Name</option>
                  <option value="serial">Serial</option>
                  <option value="stale">Stale first</option>
                </Select>
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3">
                <span className="text-sm font-medium">Stale only</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={staleOnly}
                  onChange={(event) => setStaleOnly(event.target.checked)}
                />
              </label>
              {filtersActive ? (
                <button
                  type="button"
                  className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setCategory("ALL");
                    setSort("name");
                    setStaleOnly(false);
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
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
  action,
  collapsible = false,
  expanded = true,
  onToggle,
}: {
  title: string;
  count: number;
  children: ReactNode;
  action?: ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  if (count === 0) return null;
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-heading`;
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={expanded}
            aria-controls={`${headingId}-list`}
            onClick={onToggle}
          >
            <h2 id={headingId} className="text-sm font-semibold">
              {title}
            </h2>
            <span className="text-xs text-muted-foreground">{count}</span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h2 id={headingId} className="text-sm font-semibold">
              {title}
            </h2>
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
        )}
        {action}
      </div>
      {expanded ? (
        <div id={collapsible ? `${headingId}-list` : undefined} className="space-y-2">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function EquipmentRow({
  item,
  userId,
  pendingRequest,
  selectable,
  selected,
  variant,
  onToggle,
}: {
  item: EquipmentDTO;
  userId: string;
  pendingRequest?: OperationRequestDTO;
  selectable: boolean;
  selected: boolean;
  variant: "available" | "withMe" | "withOthers";
  onToggle: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const freshness = mounted
    ? getLocationFreshness(
        item.liveUpdatedAt,
        LIVE_LOCATION_FRESH_MS,
        LIVE_LOCATION_STALE_MS,
      )
    : null;
  const stale = freshness?.kind === "stale";
  const content = (
    <>
      {selectable ? (
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
      ) : null}
      <CategoryIcon category={item.category} />
      <KitMeta
        item={item}
        userId={userId}
        pendingRequest={pendingRequest}
        variant={variant}
        freshness={freshness}
        since={mounted ? formatSinceWeekday(item.signedOutAt) : null}
      />
    </>
  );

  const className = cn(
    "flex w-full min-h-11 min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left",
    selected
      ? "border-primary bg-primary/10"
      : stale
        ? "border-destructive/35 bg-destructive/10"
        : selectable
          ? "border-border"
          : "border-border bg-muted/20",
  );

  if (selectable) {
    return (
      <label
        className={cn(
          className,
          "cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          onChange={onToggle}
          aria-label={`${selected ? "Deselect" : "Select"} ${item.name}`}
        />
        {content}
      </label>
    );
  }

  return <div className={className}>{content}</div>;
}

function KitMeta({
  item,
  userId,
  pendingRequest,
  variant,
  freshness,
  since,
}: {
  item: EquipmentDTO;
  userId: string;
  pendingRequest?: OperationRequestDTO;
  variant: "available" | "withMe" | "withOthers";
  freshness: ReturnType<typeof getLocationFreshness>;
  since: string | null;
}) {
  const holder = holderFirstName(item.currentOperator);
  const isDroppedPin =
    item.status === "SIGNED_OUT" &&
    !item.liveUpdatedAt &&
    Boolean(item.locationLabel || (item.latitude != null && item.longitude != null));

  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="break-words text-base font-medium leading-snug [overflow-wrap:anywhere]">
        {item.name}
      </p>
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {item.status === "FAULTY" ? (
          <span className="inline-flex shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
            Faulty
          </span>
        ) : null}
        {pendingRequest ? (
          <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {requestTypeLabel(pendingRequest.type)} requested
          </span>
        ) : null}
        {variant === "withOthers" ? (
          <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {holder}
            {since ? ` · ${since}` : ""}
          </span>
        ) : null}
        {item.status === "SIGNED_OUT" && item.signedOutByUserId === userId && !pendingRequest && since ? (
          <span className="text-xs text-muted-foreground">{since}</span>
        ) : null}
        {freshness ? <LocationFreshnessLabel freshness={freshness} /> : null}
        {isDroppedPin ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden />
            Dropped pin
          </span>
        ) : null}
      </span>
    </span>
  );
}

function LocationFreshnessLabel({
  freshness,
}: {
  freshness: NonNullable<ReturnType<typeof getLocationFreshness>>;
}) {
  if (freshness.kind === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        Live
      </span>
    );
  }
  if (freshness.kind === "recent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
        {freshness.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
      <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden />
      {freshness.label}
    </span>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const Icon =
    category === "CAMERAS"
      ? Camera
      : category === "AUDIO"
        ? Headphones
        : category === "CABLES"
          ? Cable
          : category === "COMPUTING"
            ? Laptop
            : category === "DISPLAYS"
              ? Monitor
              : category === "LIGHTING"
                ? Lamp
                : category === "OTHERS"
                  ? Package
                  : Layers;
  return (
    <span
      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
