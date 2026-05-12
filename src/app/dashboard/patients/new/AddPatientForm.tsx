"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPatient } from "@/lib/actions/patients";
import { PatientForm, type PatientFormValues } from "@/components/PatientForm";

export function AddPatientForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(data: PatientFormValues) {
    startTransition(async () => {
      const result = await createPatient(data);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create patient");
        return;
      }
      toast.success("Patient created");
      router.push(`/dashboard/patients/${result.id}`);
    });
  }

  return <PatientForm mode="create" onSubmit={onSubmit} isPending={isPending} />;
}
