"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";

export async function createPatient(data: {
  full_name: string;
  civil_id?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      full_name: data.full_name,
      civil_id: data.civil_id || null,
      email: data.email || null,
      phone: data.phone || null,
      date_of_birth: data.date_of_birth || null,
      notes: data.notes || null,
      hospital_id: ctx.hospital.id,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createPatient failed:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/patients");

  return { success: true, id: patient.id };
}

export async function updatePatient(
  id: string,
  data: {
    full_name: string;
    civil_id?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("patients")
    .update({
      full_name: data.full_name,
      civil_id: data.civil_id || null,
      email: data.email || null,
      phone: data.phone || null,
      date_of_birth: data.date_of_birth || null,
      notes: data.notes || null,
    })
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id);

  if (error) {
    console.error("updatePatient failed:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/patients");
  revalidatePath(`/dashboard/patients/${id}`);

  return { success: true };
}
