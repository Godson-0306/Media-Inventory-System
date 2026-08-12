"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type IssueItem = {
  id: string;
  title: string;
  detail: string;
};

export function IssuePanel({ issues }: { issues: IssueItem[] }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = useMemo(
    () => issues.filter((issue) => !dismissed.includes(issue.id)),
    [dismissed, issues],
  );

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open ? (
        <div className="mb-3 w-80 rounded-xl border border-red-500/30 bg-card p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Operational issues</p>
            <button type="button" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-3">
            {visible.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <Button
        variant="destructive"
        size="sm"
        className="rounded-full shadow-lg"
        onClick={() => {
          if (open) {
            setDismissed(visible.map((issue) => issue.id));
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
      >
        {visible.length} Issue{visible.length === 1 ? "" : "s"}
        {open ? <X className="h-3.5 w-3.5" /> : null}
      </Button>
    </div>
  );
}
