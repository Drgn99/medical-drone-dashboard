import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { EditPatientForm } from "./EditPatientForm";
import type { Patient } from "@/types/database";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const supabase = await createClient();
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (error || !patient) notFound();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Users className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Edit Patient</h1>
      </div>
      <EditPatientForm patient={patient as Patient} />
    </div>
  );
}
