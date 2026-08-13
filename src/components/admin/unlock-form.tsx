"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";

export function UnlockForm({ orgName }: { orgName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Unlock failed");
        return;
      }
      toast.success("Admin unlocked for 15 minutes");
      router.refresh();
    } catch {
      toast.error("Failed to fetch. Confirm the app is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-semibold">Protected admin unlock</p>
            <p className="text-sm text-muted-foreground">{orgName}</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Sensitive actions always require password confirmation before access. Unlock lasts 15 minutes.
        </p>
        <Label htmlFor="admin-password">Confirm password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button className="mt-4 w-full" disabled={loading}>
          <Shield className="h-4 w-4" />
          {loading ? "Unlocking..." : "Unlock admin"}
        </Button>
      </form>
    </main>
  );
}
