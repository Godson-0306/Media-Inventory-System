"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JoinCodeForm } from "@/components/auth/join-code-form";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "join";

export function AuthPanel({
  orgSlug,
  loginOnly = false,
}: {
  orgSlug?: string;
  loginOnly?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { organizationName, ownerName, email, password }
          : { email, password, orgSlug };
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Request failed");
        return;
      }
      toast.success(mode === "register" ? "Organization created" : "Signed in");
      router.push(data.redirectTo ?? "/workspace");
      router.refresh();
    } catch {
      toast.error("Failed to fetch. Confirm the app and database are running.");
    } finally {
      setLoading(false);
    }
  }

  const tabs: Array<{ id: Mode; label: string }> = loginOnly
    ? [{ id: "login", label: "Log in" }]
    : [
        { id: "login", label: "Log in" },
        { id: "register", label: "Create company" },
        { id: "join", label: "Join with code" },
      ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
      {loginOnly ? (
        <p className="mb-5 text-lg font-semibold">Log in</p>
      ) : (
        <div className="mb-5 grid gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn(
                "h-11 w-full rounded-xl text-sm font-semibold",
                mode === item.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {mode === "join" ? (
        <JoinCodeForm />
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <div>
                <Label htmlFor="org">Company name</Label>
                <Input
                  id="org"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="G-Tech"
                  required
                />
              </div>
              <div>
                <Label htmlFor="owner">Your name</Label>
                <Input
                  id="owner"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="Godson"
                  required
                />
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@organization.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === "register" ? 8 : 1}
              required
            />
          </div>
          <Button className="w-full" size="lg" disabled={loading}>
            {loading
              ? "Working..."
              : mode === "register"
                ? "Create company"
                : "Log in"}
          </Button>
        </form>
      )}
    </div>
  );
}
