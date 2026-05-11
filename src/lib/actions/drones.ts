"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";

export async function addDrone(data: {
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase.from("drones").insert({
    name: data.name.trim(),
    hospital_id: ctx.hospital.id,
    status: "idle",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/drones");
  revalidatePath("/dashboard");

  return { success: true };
}
