"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { inviteStaffDirectly } from "@/lib/actions/staff";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function InviteStaffDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("staff");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    startTransition(async () => {
      const result = await inviteStaffDirectly({
        email: email.trim(),
        full_name: fullName.trim(),
        role,
      });
      if (result.success) {
        toast.success(`Invitation sent to ${email}`);
        setOpen(false);
        setEmail("");
        setFullName("");
        setRole("staff");
      } else {
        toast.error(result.error ?? "Failed to invite");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonVariants({ variant: "default" })}
      >
        <UserPlus className="mr-1.5 size-4" />
        Invite Staff
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} id="invite-form" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name *</Label>
              <Input
                id="invite-name"
                placeholder="e.g. Ahmed Al-Balushi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="invite-form"
              disabled={isPending || !email.trim() || !fullName.trim()}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
