import Link from "next/link";
import { Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { Package } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { OrderFilters } from "@/components/OrderFilters";
import { OrderStatusBadge } from "@/components/StatusBadge";
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
import type { Order } from "@/types/database";

function getRangeStart(range: string | undefined): Date | null {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string }>;
}) {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const { status, range } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, patient_name, status, drone_id, created_at, drones(name)")
    .eq("hospital_id", ctx.hospital.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const rangeStart = getRangeStart(range);
  if (rangeStart) {
    query = query.gte("created_at", rangeStart.toISOString());
  }

  const { data: orders } = await query;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Orders</h1>
        </div>
        <Link
          href="/dashboard/orders/new"
          className={buttonVariants({ variant: "default" })}
        >
          New Order
        </Link>
      </div>

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-slate-200" />}>
        <OrderFilters />
      </Suspense>

      {orders && orders.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Drone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  orders as unknown as (Order & {
                    drones: { name: string } | null;
                  })[]
                ).map((order, i) => (
                  <TableRow
                    key={order.id}
                    className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                  >
                    <TableCell>
                      <span className="font-mono text-xs">
                        {order.id.slice(-8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.patient_name}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.drones?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Package className="mb-3 size-8 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No orders found</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            {status || range
              ? "Try adjusting your filters."
              : "Create your first order to get started."}
          </p>
          {!status && !range && (
            <Link
              href="/dashboard/orders/new"
              className={buttonVariants({ variant: "default", className: "mt-4" })}
            >
              Create First Order
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
