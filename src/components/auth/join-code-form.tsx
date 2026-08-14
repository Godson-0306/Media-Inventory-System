"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { joinWithCode } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinCodeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await joinWithCode({ joinCode, name, email, password });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Joined your company workspace");
      router.push(result.redirectTo ?? "/workspace");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <Label htmlFor="join-code">Company code</Label>
        <Input
          id="join-code"
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          placeholder="ABCD-EFGH"
          required
        />
      </div>
      <div>
        <Label htmlFor="join-name">Your name</Label>
        <Input
          id="join-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jane"
          required
        />
      </div>
      <div>
        <Label htmlFor="join-email">Email</Label>
        <Input
          id="join-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@organization.com"
          required
        />
      </div>
      <div>
        <Label htmlFor="join-password">Password</Label>
        <Input
          id="join-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <Button className="w-full" size="lg" disabled={loading}>
        {loading ? "Joining..." : "Join workspace"}
      </Button>
    </form>
  );
}
