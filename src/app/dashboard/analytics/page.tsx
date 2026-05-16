import Link from "next/link";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow, subDays } from "date-fns";
import {
  Package,
  CheckCircle2,
  TrendingUp,
  Clock,
  BarChart3,
  PlusCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  OrdersOverTimeChart,
  OrdersByStatusChart,
  DroneUtilizationChart,
  type DailyCount,
  type StatusSlice,
  type DroneBar,
} from "@/components/AnalyticsCharts";
import { STATUS_GROUPS, getStatusLabel, getStatusColor } from "@/lib/status";
import type { OrderStatus } from "@/types/database";

export default async function AnalyticsPage() {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const hospitalId = ctx.hospital.id;

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  const [
    { data: currentOrders, error: currentErr },
    { data: previousOrders, error: previousErr },
    { data: drones, error: dronesErr },
    { data: recentOrders, error: recentErr },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, created_at, dispatched_at, delivered_at, drone_id, patient_name, payload_weight_grams")
      .eq("hospital_id", hospitalId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select("id, status, delivered_at, dispatched_at")
      .eq("hospital_id", hospitalId)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("drones")
      .select("id, name")
      .eq("hospital_id", hospitalId)
      .order("name"),
    supabase
      .from("orders")
      .select("id, patient_name, status, created_at, drone_id, drones(name)")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (currentErr) console.error("analytics current orders:", currentErr);
  if (previousErr) console.error("analytics previous orders:", previousErr);
  if (dronesErr) console.error("analytics drones:", dronesErr);
  if (recentErr) console.error("analytics recent:", recentErr);

  const orders = currentOrders ?? [];
  const prevOrders = previousOrders ?? [];
  const droneList = (drones ?? []) as { id: string; name: string }[];

  // ── Stat calculations ───────────────────────────────────────────────────

  const totalOrders = orders.length;
  const successfulDeliveries = orders.filter((o) => o.delivered_at != null).length;
  const deliveryRate =
    totalOrders > 0 ? Math.round((successfulDeliveries / totalOrders) * 100) : null;

  // Avg delivery time
  let avgDeliveryMin: number | null = null;
  const deliveredWithTimes = orders.filter(
    (o) => o.dispatched_at && o.delivered_at
  );
  if (deliveredWithTimes.length > 0) {
    const totalMs = deliveredWithTimes.reduce((sum, o) => {
      return sum + (new Date(o.delivered_at!).getTime() - new Date(o.dispatched_at!).getTime());
    }, 0);
    avgDeliveryMin = Math.round(totalMs / deliveredWithTimes.length / 60000);
  }

  // Previous period comparisons
  const prevTotal = prevOrders.length;
  const prevDeliveries = prevOrders.filter((o) => o.delivered_at != null).length;

  function comparison(current: number, previous: number): string | null {
    if (previous === 0) return null;
    const diff = current - previous;
    if (diff === 0) return "Same as previous period";
    return diff > 0 ? `+${diff} vs previous period` : `${diff} vs previous period`;
  }

  // ── Orders Over Time (zero-filled) ─────────────────────────────────────

  const dailyCounts: DailyCount[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = subDays(now, i);
    const dateStr = format(day, "yyyy-MM-dd");
    const label = format(day, "MMM d");
    const count = orders.filter(
      (o) => o.created_at.slice(0, 10) === dateStr
    ).length;
    dailyCounts.push({ date: label, count });
  }

  // ── Orders by Status (grouped by outcome) ──────────────────────────────

  const groupedCounts: Record<string, number> = {};
  for (const o of orders) {
    const group = STATUS_GROUPS[o.status];
    const label = group?.label ?? o.status;
    groupedCounts[label] = (groupedCounts[label] ?? 0) + 1;
  }

  // Find a representative status for each group label (for color lookup)
  const groupColorMap: Record<string, string> = {};
  for (const [status, group] of Object.entries(STATUS_GROUPS)) {
    if (!groupColorMap[group.label]) {
      groupColorMap[group.label] = getStatusColor(status);
    }
  }

  const statusSlices: StatusSlice[] = Object.entries(groupedCounts)
    .map(([label, count]) => ({
      status: label.toLowerCase().replace(/\s/g, "_"),
      label,
      count,
      color: groupColorMap[label] ?? "#94a3b8",
    }))
    .filter((s) => s.count > 0);

  // ── Drone Utilization ──────────────────────────────────────────────────

  const droneDeliveries: Record<string, number> = {};
  for (const o of orders) {
    if (o.delivered_at && o.drone_id) {
      droneDeliveries[o.drone_id] = (droneDeliveries[o.drone_id] ?? 0) + 1;
    }
  }

  const droneBars: DroneBar[] = droneList.map((d) => ({
    name: d.name,
    deliveries: droneDeliveries[d.id] ?? 0,
  }));

  // ── Recent Activity ────────────────────────────────────────────────────

  const recent = (recentOrders ?? []) as unknown as {
    id: string;
    patient_name: string;
    status: OrderStatus;
    created_at: string;
    drone_id: string | null;
    drones: { name: string } | null;
  }[];

  // ── Empty state check ──────────────────────────────────────────────────

  if (totalOrders === 0) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational metrics for {ctx.hospital.name}
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="mb-3 size-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No data yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Create and dispatch your first order to see analytics here.
            </p>
            <Link
              href="/dashboard/orders/new"
              className={buttonVariants({ variant: "default", className: "mt-4" })}
            >
              <PlusCircle className="mr-2 size-4" />
              Create Order
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const stats = [
    {
      label: "Total Orders",
      value: totalOrders,
      icon: Package,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      sub: comparison(totalOrders, prevTotal),
    },
    {
      label: "Successful Deliveries",
      value: successfulDeliveries,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      sub: comparison(successfulDeliveries, prevDeliveries),
    },
    {
      label: "Delivery Rate",
      value: deliveryRate != null ? `${deliveryRate}%` : "—",
      icon: TrendingUp,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      sub: null,
    },
    {
      label: "Avg Delivery Time",
      value: avgDeliveryMin != null ? `${avgDeliveryMin} min` : "—",
      icon: Clock,
      iconColor: "text-slate-600",
      iconBg: "bg-slate-100",
      sub: null,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Operational metrics for {ctx.hospital.name}
          </p>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Last 30 days
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </p>
                <div className={`rounded-full p-2 ${s.iconBg}`}>
                  <s.icon className={`size-4 ${s.iconColor}`} />
                </div>
              </div>
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
              {s.sub ? (
                <p
                  className={`mt-0.5 text-xs ${
                    s.sub.startsWith("+") ? "text-green-600" : s.sub.startsWith("-") ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {s.sub}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {prevTotal === 0 ? "No previous data" : "—"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts: line + donut */}
      <div className="grid gap-6 md:grid-cols-2">
        <OrdersOverTimeChart data={dailyCounts} />
        <OrdersByStatusChart data={statusSlices} total={totalOrders} />
      </div>

      {/* Drone utilization */}
      {droneBars.length > 0 && <DroneUtilizationChart data={droneBars} />}

      {/* Recent Activity */}
      {recent.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">Recent Activity</p>
            </div>
            <ul className="divide-y">
              {recent.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="truncate font-medium">
                        {order.patient_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {order.drones?.name ?? "—"}
                      </span>
                      <StatusPill status={order.status} />
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {formatDistanceToNow(new Date(order.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    dispatched: "bg-blue-50 text-blue-700",
    in_flight: "bg-blue-50 text-blue-700",
    arrived: "bg-blue-50 text-blue-700",
    delivering: "bg-blue-50 text-blue-700",
    returning: "bg-blue-50 text-blue-700",
    delivered: "bg-green-50 text-green-700",
    returned: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
    failed: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
