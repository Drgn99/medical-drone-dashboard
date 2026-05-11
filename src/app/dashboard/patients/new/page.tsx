import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getHospitalContext } from "@/lib/hospital";
import { AddPatientForm } from "./AddPatientForm";

export default async function NewPatientPage() {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Users className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Add Patient</h1>
      </div>
      <AddPatientForm />
    </div>
  );
}
