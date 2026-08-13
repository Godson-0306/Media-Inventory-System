"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMember } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { MemberDTO } from "@/lib/types";

export function MembersAdmin({ members }: { members: MemberDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          People in this organization. Workspace sign-out picks from this list so you always know who took the kit.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Organization members</h2>
          {members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Add a member on the right. They can log in and work from the workspace."
            />
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="rounded-lg border border-border px-3 py-3">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.email} · {member.role === "OWNER" ? "Owner" : "Member"} ·{" "}
                    {formatDateTime(member.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 font-medium">Add member</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await addMember({ name, email, password });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Member added");
                setName("");
                setEmail("");
                setPassword("");
              });
            }}
          >
            <div>
              <Label htmlFor="member-name">Full name</Label>
              <Input
                id="member-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Operator"
                required
              />
            </div>
            <div>
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane@organization.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="member-password">Temporary password</Label>
              <Input
                id="member-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button className="w-full" disabled={pending}>
              Add member
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
