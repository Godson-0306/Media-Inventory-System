"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateAppearance } from "@/actions/appearance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OrgBranding } from "@/lib/org";

export function AppearanceAdmin({
  locked,
  branding,
  orgName,
  loginPath,
}: {
  locked: boolean;
  branding: OrgBranding | null;
  orgName: string;
  loginPath: string;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    brandName: branding?.brandName ?? orgName,
    logoUrl: branding?.logoUrl ?? "",
    accentColor: branding?.accentColor ?? "#3b82f6",
    loginHeadline: branding?.loginHeadline ?? "",
    loginTagline: branding?.loginTagline ?? "",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Appearance</h1>
        <p className="text-sm text-muted-foreground">
          Custom organization interface is included on Enterprise. Light and dark mode stay
          available on every plan.
        </p>
      </div>
      {locked ? (
        <Card className="border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium">Included on Enterprise</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can preview these fields. Saving is unlocked after the company is on Enterprise.
          </p>
          <Link href="/org/billing" className="mt-3 inline-block text-sm text-primary hover:underline">
            View plans
          </Link>
        </Card>
      ) : null}
      <Card className="max-w-xl p-4">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await updateAppearance(form);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success("Appearance saved");
            });
          }}
        >
          <div>
            <Label>Display name</Label>
            <Input
              value={form.brandName}
              onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
              disabled={locked}
            />
          </div>
          <div>
            <Label>Logo image URL</Label>
            <Input
              value={form.logoUrl}
              onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
              placeholder="https://"
              disabled={locked}
            />
          </div>
          <div>
            <Label>Accent color</Label>
            <Input
              type="color"
              value={form.accentColor || "#3b82f6"}
              onChange={(event) => setForm((current) => ({ ...current, accentColor: event.target.value }))}
              disabled={locked}
            />
          </div>
          <div>
            <Label>Login headline</Label>
            <Input
              value={form.loginHeadline}
              onChange={(event) =>
                setForm((current) => ({ ...current, loginHeadline: event.target.value }))
              }
              disabled={locked}
            />
          </div>
          <div>
            <Label>Login tagline</Label>
            <Textarea
              value={form.loginTagline}
              onChange={(event) =>
                setForm((current) => ({ ...current, loginTagline: event.target.value }))
              }
              disabled={locked}
            />
          </div>
          <Button disabled={pending || locked}>{pending ? "Saving..." : "Save appearance"}</Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Branded sign-in path: <span className="font-medium text-foreground">{loginPath}</span>
        </p>
      </Card>
    </div>
  );
}
