"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { approveStaffRequest, declineStaffRequest } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PendingRequestActions({
  staffId,
  staffName,
}: {
  staffId: string;
  staffName: string;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveStaffRequest(staffId);
      if (result.success) {
        toast.success(`${staffName} has been approved`);
        setApproveOpen(false);
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineStaffRequest(staffId);
      if (result.success) {
        toast.success(`${staffName}'s request was declined`);
        setDeclineOpen(false);
      } else {
        toast.error(result.error ?? "Failed to decline");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setApproveOpen(true)}
        disabled={isPending}
        className="text-green-700 border-green-200 hover:bg-green-50"
      >
        <CheckCircle2 className="mr-1 size-3.5" />
        Approve
      </Button>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {staffName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will grant {staffName} access to the hospital dashboard
              as a staff member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDeclineOpen(true)}
        disabled={isPending}
        className="text-red-700 border-red-200 hover:bg-red-50"
      >
        <XCircle className="mr-1 size-3.5" />
        Decline
      </Button>

      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline {staffName}&apos;s request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deny {staffName}&apos;s access request. They will see a
              rejection message when they try to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDecline}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
