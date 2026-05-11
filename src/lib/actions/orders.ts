"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";

export async function createOrder(data: {
  patient_id: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address?: string;
  payload_description: string;
  payload_weight_grams: number;
  drone_id: string;
}): Promise<{ success: false; error: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  // Fetch patient to build the denormalized snapshot
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name, email, phone")
    .eq("id", data.patient_id)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (patientError || !patient) {
    console.error("patient lookup for order failed:", patientError);
    return { success: false, error: "Patient not found" };
  }

  const otp_code = String(randomInt(100000, 999999));

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      patient_id: data.patient_id,
      patient_name: patient.full_name,
      patient_email: patient.email ?? "",
      patient_phone: patient.phone ?? null,
      dropoff_lat: data.dropoff_lat,
      dropoff_lng: data.dropoff_lng,
      dropoff_address: data.dropoff_address ?? null,
      payload_description: data.payload_description,
      payload_weight_grams: data.payload_weight_grams,
      drone_id: data.drone_id,
      hospital_id: ctx.hospital.id,
      created_by: ctx.user.id,
      status: "pending",
      otp_code,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");

  redirect(`/dashboard/orders/${order.id}`);
}

export async function dispatchOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, hospital_id, drone_id, dropoff_lat, dropoff_lng, status")
    .eq("id", orderId)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (fetchError || !order) return { success: false, error: "Order not found" };
  if (order.status !== "pending")
    return { success: false, error: "Order is not pending" };
  if (!order.drone_id)
    return { success: false, error: "No drone assigned to this order" };

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) return { success: false, error: updateError.message };

  await supabase.from("drone_commands").insert({
    drone_id: order.drone_id,
    order_id: orderId,
    command_type: "goto",
    payload: { lat: order.dropoff_lat, lng: order.dropoff_lng, alt: 30 },
    status: "pending",
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function cancelOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("hospital_id", ctx.hospital.id)
    .in("status", ["pending", "dispatched"]);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");

  return { success: true };
}
