import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { TrackingMapDynamic } from "@/components/TrackingMapDynamic";
import { LiveDroneMapDynamic } from "@/components/LiveDroneMapDynamic";
import { OtpVerifier } from "@/components/OtpVerifier";
import type { OrderStatus } from "@/types/database";

interface PublicOrder {
  id: string;
  patient_name: string;
  status: OrderStatus;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  created_at: string;
  drone_id: string | null;
  hospital_name: string;
  hospital_latitude: number;
  hospital_longitude: number;
}

const STATUS_META: Record<
  OrderStatus,
  { label: string; bg: string; text: string; description: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-slate-100",
    text: "text-slate-700",
    description: "Your order has been placed and is awaiting dispatch.",
  },
  dispatched: {
    label: "Dispatched",
    bg: "bg-blue-50",
    text: "text-blue-700",
    description: "The drone has been dispatched and is preparing for flight.",
  },
  in_flight: {
    label: "In Flight",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    description: "Your delivery is in the air and on its way.",
  },
  arrived: {
    label: "Arrived",
    bg: "bg-amber-50",
    text: "text-amber-700",
    description: "The drone has arrived at your location. Please confirm receipt with your code.",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-green-50",
    text: "text-green-700",
    description: "Your delivery has been successfully confirmed. Thank you!",
  },
  returned: {
    label: "Returned",
    bg: "bg-orange-50",
    text: "text-orange-700",
    description: "The drone has returned to the hospital without completing delivery.",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-700",
    description: "This order has been cancelled.",
  },
};

function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("get_public_order", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("get_public_order error:", error);
    notFound();
  }

  const order = (Array.isArray(data) ? data[0] : data) as PublicOrder | null;
  if (!order) notFound();

  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const hasHospitalCoords =
    order.hospital_latitude != null && order.hospital_longitude != null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {order.hospital_name}
          </p>
          <h1 className="mt-0.5 text-base font-semibold text-slate-900">
            Medical Drone Delivery
          </h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {/* Status banner */}
        <div className={`rounded-xl px-5 py-4 ${meta.bg}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${meta.text}`}>{meta.label}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.text} border border-current/20`}>
              {format(new Date(order.created_at), "dd MMM yyyy")}
            </span>
          </div>
          <p className={`mt-1 text-sm ${meta.text} opacity-80`}>
            {meta.description}
          </p>
        </div>

        {/* Dropoff info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Delivery Location
          </p>
          <p className="text-sm font-medium text-slate-900">
            {order.dropoff_address ?? `${order.dropoff_lat.toFixed(5)}, ${order.dropoff_lng.toFixed(5)}`}
          </p>

          {/* Map */}
          {hasHospitalCoords && order.drone_id ? (
            <LiveDroneMapDynamic
              droneId={order.drone_id}
              orderId={order.id}
              hospitalLatLng={{ lat: order.hospital_latitude, lng: order.hospital_longitude }}
              dropoffLatLng={{ lat: order.dropoff_lat, lng: order.dropoff_lng }}
              hospitalName={order.hospital_name}
              dropoffAddress={order.dropoff_address}
              fallbackStatus={order.status}
            />
          ) : hasHospitalCoords ? (
            <TrackingMapDynamic
              hospitalLat={order.hospital_latitude}
              hospitalLng={order.hospital_longitude}
              hospitalName={order.hospital_name}
              dropoffLat={order.dropoff_lat}
              dropoffLng={order.dropoff_lng}
              dropoffAddress={order.dropoff_address}
            />
          ) : null}
        </div>

        {/* OTP verifier — shown only when drone has arrived */}
        {order.status === "arrived" && (
          <OtpVerifier orderId={order.id} />
        )}

        {/* Already delivered */}
        {order.status === "delivered" && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            Delivery confirmed. Thank you for using {order.hospital_name}&apos;s drone service.
          </div>
        )}
      </main>

      <footer className="mt-8 pb-8 text-center">
        <p className="text-xs text-muted-foreground">
          {order.hospital_name} · Autonomous Medical Drone System
        </p>
      </footer>
    </div>
  );
}
