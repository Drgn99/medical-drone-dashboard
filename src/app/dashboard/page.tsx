import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Plane, Package, Clock, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DroneStatusBadge, OrderStatusBadge } from "@/components/StatusBadge";
import type { Drone, Order } from "@/types/database";

function BatteryBar({ value }: { value: number | null }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <div
          className={pct > 20 ? "h-full bg-green-500" : "h-full bg-red-500"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const hospitalId = ctx.hospital.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: activeDrones },
    { count: pendingOrders },
    { count: todayOrders },
    { data: deliveredRows },
    { data: drones },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from("drones")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .in("status", ["in_flight", "delivering", "returning"]),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .gte("created_at", today.toISOString()),
    supabase
      .from("orders")
      .select("dispatched_at, delivered_at")
      .eq("hospital_id", hospitalId)
      .eq("status", "delivered")
      .not("dispatched_at", "is", null)
      .not("delivered_at", "is", null),
    supabase
      .from("drones")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("name"),
    supabase
      .from("orders")
      .select("id, patient_name, status, drone_id, created_at, drones(name)")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  let avgDelivery = "—";
  if (deliveredRows && deliveredRows.length > 0) {
    const totalMs = deliveredRows.reduce(
      (sum: number, o: { dispatched_at: string; delivered_at: string }) => {
        return (
          sum +
          (new Date(o.delivered_at).getTime() -
            new Date(o.dispatched_at).getTime())
        );
      },
      0
    );
    avgDelivery = `${Math.round(totalMs / deliveredRows.length / 60000)} min`;
  }

  const stats = [
    {
      label: "Active Drones",
      value: activeDrones ?? 0,
      icon: Plane,
      color: "text-blue-600",
    },
    {
      label: "Pending Orders",
      value: pendingOrders ?? 0,
      icon: Package,
      color: "text-amber-600",
    },
    {
      label: "Orders Today",
      value: todayOrders ?? 0,
      icon: Activity,
      color: "text-green-600",
    },
    {
      label: "Avg Delivery",
      value: avgDelivery,
      icon: Clock,
      color: "text-slate-600",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`size-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fleet status */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Fleet Status</h2>
        {drones && drones.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(drones as Drone[]).map((drone) => (
              <Card key={drone.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {drone.name}
                    </CardTitle>
                    <DroneStatusBadge status={drone.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <BatteryBar value={drone.battery} />
                  <p className="text-xs text-muted-foreground">
                    {drone.last_seen
                      ? `Last seen ${formatDistanceToNow(new Date(drone.last_seen), { addSuffix: true })}`
                      : "Never seen"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No drones registered.</p>
        )}
      </section>

      {/* Recent orders */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Recent Orders</h2>
        {recentOrders && recentOrders.length > 0 ? (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentOrders as unknown as (Order & { drones: { name: string } | null })[]).map(
                    (order, i) => (
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
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        )}
      </section>
    </div>
  );
}
