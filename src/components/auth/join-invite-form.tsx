"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinWithToken } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinInviteForm({
  token,
  lockedEmail,
  orgName,
}: {
  token: string;
  lockedEmail?: string | null;
  orgName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await joinWithToken({ token, name, email, password });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Joined ${orgName}`);
      router.push(result.redirectTo ?? "/workspace");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <Label htmlFor="invite-name">Your name</Label>
        <Input
          id="invite-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jane"
          required
        />
      </div>
      <div>
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@organization.com"
          required
          readOnly={Boolean(lockedEmail)}
        />
      </div>
      <div>
        <Label htmlFor="invite-password">Password</Label>
        <Input
          id="invite-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <Button className="w-full" size="lg" disabled={loading}>
        {loading ? "Joining..." : "Create staff account"}
      </Button>
    </form>
  );
}
