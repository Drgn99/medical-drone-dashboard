"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePatient } from "@/lib/actions/patients";
import { PatientForm, type PatientFormValues } from "@/components/PatientForm";
import type { Patient } from "@/types/database";

export function EditPatientForm({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues: Partial<PatientFormValues> = {
    full_name: patient.full_name,
    civil_id: patient.civil_id ?? undefined,
    email: patient.email ?? undefined,
    phone: patient.phone ?? undefined,
    date_of_birth: patient.date_of_birth ?? undefined,
    notes: patient.notes ?? undefined,
  };

  function onSubmit(data: PatientFormValues) {
    startTransition(async () => {
      const result = await updatePatient(patient.id, data);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update patient");
        return;
      }
      toast.success("Patient updated");
      router.push(`/dashboard/patients/${patient.id}`);
    });
  }

  return (
    <PatientForm
      mode="edit"
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      isPending={isPending}
    />
  );
}
