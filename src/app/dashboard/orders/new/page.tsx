import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { NewOrderForm } from "./NewOrderForm";
import type { Drone, Patient } from "@/types/database";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const { patientId } = await searchParams;

  const supabase = await createClient();
  const [
    { data: drones, error: dronesError },
    { data: patients, error: patientsError },
  ] = await Promise.all([
    supabase
      .from("drones")
      .select("id, name, status")
      .eq("hospital_id", ctx.hospital.id)
      .order("name"),
    supabase
      .from("patients")
      .select("id, full_name, civil_id, email, phone")
      .eq("hospital_id", ctx.hospital.id)
      .order("full_name"),
  ]);

  if (dronesError) console.error("drones fetch failed:", dronesError);
  if (patientsError) console.error("patients fetch failed:", patientsError);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold">New Order</h1>
      <NewOrderForm
        drones={(drones as Drone[]) ?? []}
        patients={(patients as Patient[]) ?? []}
        defaultPatientId={patientId}
      />
    </div>
  );
}
