"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send, X } from "lucide-react";
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
import type { OrderStatus } from "@/types/database";

interface Props {
  orderId: string;
  status: OrderStatus;
  onDispatch: () => Promise<{ success: boolean; error?: string }>;
  onCancel: () => Promise<{ success: boolean; error?: string }>;
}

export function OrderActions({ status, onDispatch, onCancel }: Props) {
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDispatch() {
    startTransition(async () => {
      const result = await onDispatch();
      if (result.success) {
        toast.success("Order dispatched");
        setDispatchOpen(false);
      } else {
        toast.error(result.error ?? "Failed to dispatch order");
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await onCancel();
      if (result.success) {
        toast.success("Order cancelled");
        setCancelOpen(false);
      } else {
        toast.error(result.error ?? "Failed to cancel order");
      }
    });
  }

  const isTerminal =
    status === "delivered" ||
    status === "returned" ||
    status === "cancelled";

  if (isTerminal) return null;

  return (
    <div className="flex gap-3">
      {status === "pending" && (
        <>
          <Button
            variant="default"
            onClick={() => setDispatchOpen(true)}
            disabled={isPending}
          >
            <Send className="mr-2 size-4" />
            Dispatch
          </Button>

          <AlertDialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Dispatch this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  The drone will be commanded to fly to the dropoff location.
                  The patient will be notified by email. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDispatch} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Dispatch
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {(status === "pending" || status === "dispatched") && (
        <>
          <Button
            variant="destructive"
            onClick={() => setCancelOpen(true)}
            disabled={isPending}
          >
            <X className="mr-2 size-4" />
            Cancel Order
          </Button>

          <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  The order will be marked as cancelled and cannot be
                  reactivated. If the drone is in flight, send an RTL command
                  instead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Keep order
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Cancel order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
