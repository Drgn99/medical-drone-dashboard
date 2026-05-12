"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendDispatchEmail } from "@/lib/actions/orders";

export function ResendEmailButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function handleClick() {
    startTransition(async () => {
      const result = await resendDispatchEmail(orderId);
      if (result.success) {
        setSent(true);
        toast.success("Notification email sent");
      } else {
        toast.error(result.error ?? "Failed to send email");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending || sent}
      onClick={handleClick}
    >
      {isPending ? (
        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
      ) : (
        <Mail className="mr-1.5 size-3.5" />
      )}
      {sent ? "Sent" : "Resend Email"}
    </Button>
  );
}
