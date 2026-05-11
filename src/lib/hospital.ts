import { createClient } from "@/lib/supabase/server";
import type { Hospital, HospitalStaff } from "@/types/database";

export interface HospitalContext {
  user: { id: string; email: string };
  staff: Pick<HospitalStaff, "id" | "role" | "full_name">;
  hospital: Hospital;
}

export async function getHospitalContext(): Promise<HospitalContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staff, error: staffError } = await supabase
    .from("hospital_staff")
    .select("id, role, full_name, hospital_id")
    .eq("user_id", user.id)
    .single();

  if (staffError) {
    console.error("hospital_staff lookup failed:", staffError);
    return null;
  }
  if (!staff) return null;

  const { data: hospital, error: hospitalError } = await supabase
    .from("hospitals")
    .select("id, name, address, latitude, longitude, created_at")
    .eq("id", staff.hospital_id)
    .single();

  if (hospitalError) {
    console.error("hospitals lookup failed:", hospitalError);
    return null;
  }
  if (!hospital) return null;

  return {
    user: { id: user.id, email: user.email ?? "" },
    staff: { id: staff.id, role: staff.role, full_name: staff.full_name },
    hospital: hospital as Hospital,
  };
}
