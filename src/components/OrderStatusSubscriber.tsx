"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function OrderStatusSubscriber({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const statusRef = useRef(initialStatus);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus && newStatus !== statusRef.current) {
            statusRef.current = newStatus;
            startTransition(() => {
              router.refresh();
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // orderId is stable for the lifetime of this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
