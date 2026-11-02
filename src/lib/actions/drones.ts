"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";

export async function addDrone(data: {
  name: string;
  weight_grams: number;
  max_payload_grams: number;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase.from("drones").insert({
    name: data.name.trim(),
    hospital_id: ctx.hospital.id,
    status: "idle",
    weight_grams: data.weight_grams,
    max_payload_grams: data.max_payload_grams,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/drones");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateDrone(
  id: string,
  data: {
    name: string;
    weight_grams: number;
    max_payload_grams: number;
  }
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  // Verify the drone belongs to this hospital before updating
  const { data: existing, error: fetchError } = await supabase
    .from("drones")
    .select("id")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: "Drone not found" };
  }

  const { error } = await supabase
    .from("drones")
    .update({
      name: data.name.trim(),
      weight_grams: data.weight_grams,
      max_payload_grams: data.max_payload_grams,
    })
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/drones");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function rechargeDrone(
  droneId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { data: drone, error: fetchError } = await supabase
    .from("drones")
    .select("id, status")
    .eq("id", droneId)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (fetchError || !drone) {
    return { success: false, error: "Drone not found" };
  }

  if (["in_flight", "delivering", "returning"].includes(drone.status)) {
    return { success: false, error: "Cannot recharge a drone that is in flight" };
  }

  const updates: Record<string, unknown> = {
    battery_pct: 100,
    last_seen: new Date().toISOString(),
  };

  if (drone.status === "maintenance" || drone.status === "offline") {
    updates.status = "idle";
  }

  const { error } = await supabase
    .from("drones")
    .update(updates)
    .eq("id", droneId)
    .eq("hospital_id", ctx.hospital.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/drones");

  return { success: true };
}

// ── Servo test commands (picked up by the Raspberry Pi listener) ────────────

export type ServoCommandType = "servo_open" | "servo_close" | "servo_test";

export async function sendServoCommand(
  droneId: string,
  commandType: ServoCommandType
): Promise<{ success: boolean; commandId?: string; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { data: drone, error: fetchError } = await supabase
    .from("drones")
    .select("id")
    .eq("id", droneId)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (fetchError || !drone) return { success: false, error: "Drone not found" };

  const { data: command, error } = await supabase
    .from("drone_commands")
    .insert({
      drone_id: droneId,
      order_id: null,
      command_type: commandType,
      payload: {},
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !command) {
    return { success: false, error: error?.message ?? "Failed to send command" };
  }

  return { success: true, commandId: command.id };
}

export async function getDroneCommandStatus(
  commandId: string
): Promise<{ status: string | null; result: string | null }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { status: null, result: null };

  const supabase = await createClient();

  const { data } = await supabase
    .from("drone_commands")
    .select("status, payload, drone_id")
    .eq("id", commandId)
    .single();

  if (!data) return { status: null, result: null };

  // Only report on commands for this hospital's drones.
  const { data: drone } = await supabase
    .from("drones")
    .select("id")
    .eq("id", data.drone_id)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (!drone) return { status: null, result: null };

  const payload = (data.payload ?? {}) as Record<string, unknown>;
  const result = typeof payload.result === "string" ? payload.result : null;

  return { status: data.status, result };
}
