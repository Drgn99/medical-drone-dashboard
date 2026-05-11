"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

          <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dispatch Order?</DialogTitle>
                <DialogDescription>
                  This will set the order status to &quot;dispatched&quot;, record the
                  dispatch time, and send a goto command to the assigned drone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDispatchOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleDispatch} disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Confirm Dispatch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Order?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The order status will be set to
                  &quot;cancelled&quot;.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCancelOpen(false)}
                  disabled={isPending}
                >
                  Go Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Confirm Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
