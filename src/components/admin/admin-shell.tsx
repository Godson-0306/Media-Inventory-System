"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  History,
  Layers,
  Menu,
  Truck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IssuePanel } from "@/components/issue-panel";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/requests", label: "Requests", icon: ClipboardList },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/equipment", label: "Equipment", icon: Layers },
  { href: "/admin/rentals", label: "Rentals", icon: Truck },
  { href: "/admin/faults", label: "Faulty Queue", icon: TriangleAlert },
  { href: "/admin/history", label: "History", icon: History },
];

export function AdminShell({
  orgName,
  userName,
  openFaults,
  pendingRequests,
  children,
}: {
  orgName: string;
  userName: string;
  openFaults: number;
  pendingRequests: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="space-y-1">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="min-h-svh lg:grid lg:h-svh lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-card/60 p-4 lg:flex lg:h-svh lg:flex-col lg:overflow-y-auto">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <Logo />
            <div>
              <p className="text-sm font-semibold">Admin Dashboard</p>
              <p className="text-xs text-muted-foreground">{orgName}</p>
            </div>
          </div>
          <div className="flex-1">{nav}</div>
          <Button
            variant="ghost"
            className="mt-4 justify-start"
            onClick={() => router.push("/workspace")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Button>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-sm">{userName}</span>
          </div>
        </aside>
        <div className="flex min-h-svh flex-col lg:h-svh lg:min-h-0 lg:overflow-y-auto">
          <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Button variant="outline" size="icon" onClick={() => setOpen((value) => !value)}>
                <Menu className="h-4 w-4" />
              </Button>
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                Owner
              </Badge>
            </div>
            {open ? <div className="border-t border-border p-4">{nav}</div> : null}
          </div>
          <div className="sticky top-0 z-20 hidden justify-end border-b border-border bg-background/95 px-6 py-4 backdrop-blur lg:flex">
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              Owner
            </Badge>
          </div>
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </div>
      <IssuePanel
        issues={[
          ...(pendingRequests > 0
            ? [
                {
                  id: "pending-requests",
                  title: `${pendingRequests} pending request${pendingRequests === 1 ? "" : "s"}`,
                  detail: "Open Requests to accept or decline workspace sign-out, sign-in, and rental moves.",
                },
              ]
            : []),
          ...(openFaults > 0
            ? [
                {
                  id: "open-faults",
                  title: `${openFaults} open fault${openFaults === 1 ? "" : "s"}`,
                  detail: "Open the Faulty Queue to mark items in repair or resolved.",
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
