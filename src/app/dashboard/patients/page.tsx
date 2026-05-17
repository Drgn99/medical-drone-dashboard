import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { PatientsSearch } from "@/components/PatientsSearch";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Patient } from "@/types/database";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const { q } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("id, full_name, civil_id, email, phone, created_at")
    .eq("hospital_id", ctx.hospital.id)
    .order("full_name");

  if (q?.trim()) {
    const safe = q.replace(/[,%]/g, "");
    query = query.or(
      `full_name.ilike.%${safe}%,civil_id.ilike.%${safe}%,phone.ilike.%${safe}%`
    );
  }

  const { data: patients, error } = await query;
  if (error) console.error("patients list failed:", error);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Patients</h1>
        </div>
        <Link
          href="/dashboard/patients/new"
          className={buttonVariants({ variant: "default" })}
        >
          Add Patient
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200" />
        }
      >
        <PatientsSearch defaultValue={q} />
      </Suspense>

      {patients && patients.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Civil ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(patients as Patient[]).map((patient, i) => (
                  <TableRow
                    key={patient.id}
                    className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                  >
                    <TableCell className="font-medium">
                      {patient.full_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {patient.civil_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(patient.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/patients/${patient.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-md my-12">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 size-12 text-slate-300" />
            <p className="text-lg font-semibold">
              {q ? "No patients match your search" : "No patients registered"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {q
                ? "Try a different search term."
                : "Add your first patient to start dispatching orders."}
            </p>
            {!q && (
              <Link
                href="/dashboard/patients/new"
                className={buttonVariants({
                  variant: "default",
                  className: "mt-4",
                })}
              >
                Add First Patient
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
