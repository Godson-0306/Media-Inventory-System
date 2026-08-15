"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createInvite, rotateJoinCode, setMemberStatus } from "@/actions/members";
import { changePassword } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { MemberDTO, OrgInviteDTO } from "@/lib/types";

export function MembersAdmin({
  members,
  invites,
  joinCode,
}: {
  members: MemberDTO[];
  invites: OrgInviteDTO[];
  joinCode: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function inviteUrl(token: string) {
    if (typeof window === "undefined") return `/join/${token}`;
    return `${window.location.origin}/join/${token}`;
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Invite staff or share the company code. They join on their phones and only see this
          organization’s workspace.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-4 font-medium">Organization members</h2>
            {members.length === 0 ? (
              <EmptyState
                title="No members yet"
                description="Create an invite or share the company join code."
              />
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email} · {member.role === "OWNER" ? "Owner" : "Staff"} ·{" "}
                        {member.status === "DISABLED" ? "Disabled" : "Active"} ·{" "}
                        {formatDateTime(member.createdAt)}
                      </p>
                    </div>
                    {member.role === "STAFF" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const next = member.status === "DISABLED" ? "ACTIVE" : "DISABLED";
                            const result = await setMemberStatus(member.id, next);
                            if (result.error) toast.error(result.error);
                            else toast.success(next === "DISABLED" ? "Staff disabled" : "Staff enabled");
                          })
                        }
                      >
                        {member.status === "DISABLED" ? "Enable" : "Disable"}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <h2 className="mb-4 font-medium">Pending invites</h2>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unused invites.</p>
            ) : (
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{invite.email || "Open invite"}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {formatDateTime(invite.expiresAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copy(inviteUrl(invite.token), "Invite link")}
                    >
                      Copy link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 font-medium">Company join code</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Staff can open /join on their phone and enter this code.
            </p>
            <p className="mb-4 rounded-lg border border-border bg-muted/30 px-3 py-3 font-mono text-lg tracking-widest">
              {joinCode ?? "Generating…"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!joinCode}
                onClick={() => joinCode && copy(joinCode, "Join code")}
              >
                Copy code
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await rotateJoinCode();
                    if (result.error) toast.error(result.error);
                    else toast.success("Join code rotated");
                  })
                }
              >
                Rotate
              </Button>
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-2 font-medium">Your password</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Only the organization owner can change this login password.
            </p>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await changePassword({ currentPassword, newPassword });
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Password updated");
                  setCurrentPassword("");
                  setNewPassword("");
                });
              }}
            >
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <Button className="w-full" disabled={pending}>
                Change password
              </Button>
            </form>
          </Card>
          <Card className="p-4">
            <h2 className="mb-4 font-medium">Invite staff</h2>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await createInvite({ email });
                  if ("error" in result) {
                    toast.error(result.error);
                    return;
                  }
                  await copy(inviteUrl(result.token), "Invite link");
                  toast.success("Invite created");
                  setEmail("");
                });
              }}
            >
              <div>
                <Label htmlFor="invite-email">Email (optional)</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@organization.com"
                />
              </div>
              <Button className="w-full" disabled={pending}>
                Create invite link
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
