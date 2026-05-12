"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function verifyOtp(
  orderId: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!orderId || !code) return { ok: false, error: "Missing fields" };

  const supabase = createServiceClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, otp_code, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) return { ok: false, error: "Order not found" };
  if (order.status === "delivered") return { ok: true }; // already verified
  if (order.status !== "arrived") {
    return { ok: false, error: "Drone has not arrived yet" };
  }

  // Server-side comparison — otp_code never sent to client
  if (!order.otp_code || order.otp_code.trim() !== code.trim()) {
    return { ok: false, error: "Incorrect code" };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      otp_verified_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/track/${orderId}`);

  return { ok: true };
}
