import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { MapPin, Package, User, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { dispatchOrder, cancelOrder } from "@/lib/actions/orders";
import { OrderActions } from "@/components/OrderActions";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { ResendEmailButton } from "@/components/ResendEmailButton";
import { LiveDroneMapDynamic } from "@/components/LiveDroneMapDynamic";
import { OrderStatusSubscriber } from "@/components/OrderStatusSubscriber";
import { SimulatorCommandCard } from "@/components/SimulatorCommandCard";
import { DroneCameraFeed } from "@/components/DroneCameraFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusLabel } from "@/lib/status";
import type { Order, OrderStatus } from "@/types/database";
import { headers } from "next/headers";

const TIMELINE: { status: OrderStatus | OrderStatus[]; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "dispatched", label: "Dispatched" },
  { status: ["in_flight", "delivering"] as OrderStatus[], label: "En Route" },
  { status: "arrived", label: "Arrived" },
  { status: "delivered", label: "Delivered" },
  { status: "returning", label: "Returning" },
  { status: "returned", label: "Completed" },
];

function statusMatchesStep(
  orderStatus: OrderStatus,
  stepStatus: OrderStatus | OrderStatus[]
): boolean {
  if (Array.isArray(stepStatus)) return stepStatus.includes(orderStatus);
  return orderStatus === stepStatus;
}

function StatusTimeline({ status }: { status: OrderStatus }) {
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
          {getStatusLabel(status)}
        </span>
      </div>
    );
  }

  const currentIndex = TIMELINE.findIndex((s) =>
    statusMatchesStep(status, s.status)
  );
  const isComplete = status === "returned";

  return (
    <ol className="flex flex-wrap items-center gap-0">
      {TIMELINE.map((step, i) => {
        const isDone = isComplete || i < currentIndex;
        const isCurrent = !isComplete && i === currentIndex;
        const isLast = i === TIMELINE.length - 1;
        return (
          <li key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold",
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : isDone
                    ? "bg-green-200 text-green-700"
                    : "bg-slate-100 text-slate-400",
                ].join(" ")}
              >
                {i + 1}
              </div>
              <span
                className={[
                  "text-[10px] sm:text-xs whitespace-nowrap",
                  isCurrent
                    ? "font-semibold text-blue-600"
                    : isDone
                    ? "text-green-600"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={[
                  "mx-0.5 sm:mx-1 h-0.5 w-4 sm:w-8",
                  isDone ? "bg-green-300" : "bg-slate-200",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, drones(name)")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (orderError) {
    console.error("order lookup failed:", orderError);
    notFound();
  }
  if (!order) notFound();

  // Build origin for tracking link
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const trackingUrl = `${origin}/track/${order.id}`;

  const typedOrder = order as Order & { drones: { name: string } | null };

  // Bind server actions with the order ID
  const boundDispatch = dispatchOrder.bind(null, id);
  const boundCancel = cancelOrder.bind(null, id);

  return (
    <div className="p-6 space-y-6">
      <OrderStatusSubscriber orderId={id} initialStatus={typedOrder.status} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground">
            ORDER #{id.slice(-8).toUpperCase()}
          </p>
          <h1 className="mt-1 text-xl font-semibold">
            {typedOrder.patient_name}
          </h1>
        </div>
        <OrderStatusBadge status={typedOrder.status} />
      </div>

      {/* Status timeline */}
      <Card>
        <CardContent className="overflow-x-auto pt-6 pb-4">
          <StatusTimeline status={typedOrder.status as OrderStatus} />
        </CardContent>
      </Card>

      {/* Simulator helper (demo only — visible for active orders) */}
      <SimulatorCommandCard orderId={id} orderStatus={typedOrder.status} />

      {/* Live tracking map */}
      {typedOrder.drone_id &&
        ctx.hospital.latitude != null &&
        ctx.hospital.longitude != null &&
        typedOrder.dropoff_lat != null &&
        typedOrder.dropoff_lng != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Live Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveDroneMapDynamic
                droneId={typedOrder.drone_id}
                orderId={id}
                hospitalLatLng={{
                  lat: ctx.hospital.latitude,
                  lng: ctx.hospital.longitude,
                }}
                dropoffLatLng={{
                  lat: typedOrder.dropoff_lat,
                  lng: typedOrder.dropoff_lng,
                }}
                hospitalName={ctx.hospital.name}
                dropoffAddress={typedOrder.dropoff_address}
                fallbackStatus={typedOrder.status}
              />
            </CardContent>
          </Card>
        )}

      {/* Camera feed */}
      <DroneCameraFeed
        orderStatus={typedOrder.status}
        droneName={typedOrder.drones?.name ?? undefined}
      />

      {/* Actions */}
      <OrderActions
        orderId={id}
        status={typedOrder.status as OrderStatus}
        onDispatch={boundDispatch}
        onCancel={boundCancel}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: order details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="size-4" /> Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Name" value={typedOrder.patient_name} />
              <Row label="Email" value={typedOrder.patient_email} />
              <Row label="Phone" value={typedOrder.patient_phone ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="size-4" /> Dropoff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Address"
                value={typedOrder.dropoff_address ?? "—"}
              />
              <Row
                label="Coordinates"
                value={
                  typedOrder.dropoff_lat != null &&
                  typedOrder.dropoff_lng != null
                    ? `${typedOrder.dropoff_lat.toFixed(6)}, ${typedOrder.dropoff_lng.toFixed(6)}`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="size-4" /> Payload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Description"
                value={typedOrder.payload_description ?? "—"}
              />
              <Row
                label="Weight"
                value={
                  typedOrder.payload_weight_grams
                    ? `${typedOrder.payload_weight_grams} g`
                    : "—"
                }
              />
              <Row label="Drone" value={typedOrder.drones?.name ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <Row
                label="Created"
                value={format(
                  new Date(typedOrder.created_at),
                  "dd MMM yyyy HH:mm"
                )}
              />
              {typedOrder.dispatched_at && (
                <Row
                  label="Dispatched"
                  value={format(
                    new Date(typedOrder.dispatched_at),
                    "dd MMM yyyy HH:mm"
                  )}
                />
              )}
              {typedOrder.delivered_at && (
                <Row
                  label="Delivered"
                  value={format(
                    new Date(typedOrder.delivered_at),
                    "dd MMM yyyy HH:mm"
                  )}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: OTP + tracking */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">OTP Code (Staff Only)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="font-mono text-3xl font-bold tracking-widest text-slate-800">
                  {typedOrder.otp_code ?? "——"}
                </span>
                {typedOrder.otp_code && (
                  <CopyButton text={typedOrder.otp_code} />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Share this code with the patient so they can verify delivery.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Patient Tracking Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <Copy className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                  {trackingUrl}
                </span>
                <CopyButton text={trackingUrl} />
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the patient so they can track their delivery and verify receipt with their OTP code.
              </p>
              <ResendEmailButton orderId={id} />
            </CardContent>
          </Card>
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
