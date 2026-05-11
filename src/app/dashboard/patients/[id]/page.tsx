import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Patient, Order, OrderStatus } from "@/types/database";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const supabase = await createClient();
  const [
    { data: patient, error: patientError },
    { data: recentOrders, error: ordersError },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("hospital_id", ctx.hospital.id)
      .single(),
    supabase
      .from("orders")
      .select("id, status, created_at, payload_description, drones(name)")
      .eq("patient_id", id)
      .eq("hospital_id", ctx.hospital.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (patientError) {
    console.error("patient lookup failed:", patientError);
    notFound();
  }
  if (!patient) notFound();
  if (ordersError) console.error("patient orders failed:", ordersError);

  const p = patient as Patient;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">{p.full_name}</h1>
            {p.civil_id && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {p.civil_id}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className={buttonVariants({
              variant: "outline",
              className: "cursor-not-allowed opacity-50",
            })}
          >
            Edit
          </button>
          <Link
            href={`/dashboard/orders/new?patientId=${p.id}`}
            className={buttonVariants({ variant: "default" })}
          >
            New Order
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Full name" value={p.full_name} />
            <Row label="Civil ID" value={p.civil_id ?? "—"} />
            <Row label="Email" value={p.email ?? "—"} />
            <Row label="Phone" value={p.phone ?? "—"} />
            <Row
              label="Date of birth"
              value={
                p.date_of_birth
                  ? format(new Date(p.date_of_birth), "dd MMM yyyy")
                  : "—"
              }
            />
            <Row
              label="Added"
              value={format(new Date(p.created_at), "dd MMM yyyy")}
            />
            {p.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Notes
                </p>
                <p className="text-sm">{p.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Recent Orders</h2>
          {recentOrders && recentOrders.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Drone</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      recentOrders as unknown as (Pick<
                        Order,
                        "id" | "status" | "created_at" | "payload_description"
                      > & { drones: { name: string } | null })[]
                    ).map((order, i) => (
                      <TableRow
                        key={order.id}
                        className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                      >
                        <TableCell>
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="font-mono text-xs text-blue-600 hover:underline"
                          >
                            {order.id.slice(-8).toUpperCase()}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge
                            status={order.status as OrderStatus}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.drones?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
              <Link
                href={`/dashboard/orders/new?patientId=${p.id}`}
                className={buttonVariants({
                  variant: "default",
                  className: "mt-3",
                })}
              >
                Create First Order
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
