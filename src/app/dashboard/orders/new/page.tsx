import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { NewOrderForm } from "./NewOrderForm";
import type { Drone } from "@/types/database";

export default async function NewOrderPage() {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: drones } = await supabase
    .from("drones")
    .select("id, name, status")
    .eq("hospital_id", ctx.hospital.id)
    .order("name");

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold">New Order</h1>
      <NewOrderForm drones={(drones as Drone[]) ?? []} />
    </div>
  );
}
