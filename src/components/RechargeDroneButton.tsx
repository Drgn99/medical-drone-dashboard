"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Battery, Loader2 } from "lucide-react";
import { rechargeDrone } from "@/lib/actions/drones";
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

const IN_FLIGHT_STATUSES = ["in_flight", "delivering", "returning"];

export function RechargeDroneButton({
  droneId,
  droneName,
  droneStatus,
}: {
  droneId: string;
  droneName: string;
  droneStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isFlying = IN_FLIGHT_STATUSES.includes(droneStatus);

  function handleConfirm() {
    startTransition(async () => {
      const result = await rechargeDrone(droneId);
      if (result.success) {
        toast.success(`${droneName} marked as fully charged`);
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to mark as recharged");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isFlying}
        title={isFlying ? "Cannot recharge a drone in flight" : undefined}
        onClick={() => setOpen(true)}
      >
        <Battery className="mr-1.5 size-3.5" />
        Mark as Recharged
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {droneName} as fully charged?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This sets the battery to 100%. Use this after physically swapping
              or charging the drone&apos;s LiPo battery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Mark as charged
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
