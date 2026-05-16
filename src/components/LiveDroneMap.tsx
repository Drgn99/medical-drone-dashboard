"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import type { Telemetry } from "@/types/database";

// Fix default Leaflet marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "hue-rotate-[220deg]",
});

// ── Drone SVG icon ──────────────────────────────────────────────────────────

const DRONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <!-- Arms -->
  <line x1="8" y1="8" x2="24" y2="24" stroke="#dc2626" stroke-width="1.5"/>
  <line x1="24" y1="8" x2="8" y2="24" stroke="#dc2626" stroke-width="1.5"/>
  <!-- Central body -->
  <rect x="13" y="13" width="6" height="6" rx="1" fill="#dc2626"/>
  <!-- Rotors -->
  <circle cx="8" cy="8" r="4" fill="#dc2626" opacity="0.3" stroke="#dc2626" stroke-width="1"/>
  <circle cx="24" cy="8" r="4" fill="#dc2626" opacity="0.3" stroke="#dc2626" stroke-width="1"/>
  <circle cx="8" cy="24" r="4" fill="#dc2626" opacity="0.3" stroke="#dc2626" stroke-width="1"/>
  <circle cx="24" cy="24" r="4" fill="#dc2626" opacity="0.3" stroke="#dc2626" stroke-width="1"/>
  <!-- Direction indicator (nose) -->
  <polygon points="16,4 14,10 18,10" fill="#dc2626"/>
</svg>`;

function makeDroneIcon(heading: number) {
  return L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div style="transform:rotate(${heading}deg);width:32px;height:32px;">${DRONE_SVG}</div>`,
  });
}

// ── Types ───────────────────────────────────────────────────────────────────

interface TelemetryOverlay {
  speed_ms: number | null;
  alt: number;
  battery_pct: number;
  flight_mode: string | null;
}

interface Props {
  droneId: string;
  orderId?: string;
  hospitalLatLng: { lat: number; lng: number };
  dropoffLatLng: { lat: number; lng: number };
  hospitalName?: string;
  dropoffAddress?: string | null;
  fallbackStatus?: string;
}

const TERMINAL_STATUSES = ["returned", "cancelled"];

// ── Inner map controller ────────────────────────────────────────────────────

function MapController({
  droneId,
  orderId,
  hospitalLatLng,
  dropoffLatLng,
  fallbackStatus,
  onOverlayChange,
  onConnectionChange,
}: {
  droneId: string;
  orderId?: string;
  hospitalLatLng: { lat: number; lng: number };
  dropoffLatLng: { lat: number; lng: number };
  fallbackStatus?: string;
  onOverlayChange: (o: TelemetryOverlay | null) => void;
  onConnectionChange: (connected: boolean) => void;
}) {
  const map = useMap();
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    const isTerminal = TERMINAL_STATUSES.includes(fallbackStatus ?? "");
    const supabase = createClient();

    // Create polyline (initially empty)
    const polyline = L.polyline([], {
      color: "#dc2626",
      weight: 3,
      opacity: 0.7,
    }).addTo(map);
    polylineRef.current = polyline;

    function updateDrone(row: Telemetry) {
      const pos: L.LatLngExpression = [row.lat, row.lng];
      const heading = row.heading_deg ?? 0;

      if (droneMarkerRef.current) {
        droneMarkerRef.current.setLatLng(pos);
        droneMarkerRef.current.setIcon(makeDroneIcon(heading));
      } else {
        const marker = L.marker(pos, { icon: makeDroneIcon(heading) }).addTo(
          map
        );
        marker.bindPopup("Drone");
        droneMarkerRef.current = marker;
      }

      polyline.addLatLng(pos);

      onOverlayChange({
        speed_ms: row.speed_ms,
        alt: row.alt,
        battery_pct: row.battery_pct,
        flight_mode: row.flight_mode,
      });
    }

    function fitBoundsOnce(droneLatLng?: { lat: number; lng: number }) {
      if (hasFitBoundsRef.current) return;
      hasFitBoundsRef.current = true;
      const points: L.LatLngExpression[] = [
        [hospitalLatLng.lat, hospitalLatLng.lng],
        [dropoffLatLng.lat, dropoffLatLng.lng],
      ];
      if (droneLatLng) {
        points.push([droneLatLng.lat, droneLatLng.lng]);
      }
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [48, 48] });
    }

    // Fetch initial telemetry
    const filterCol = orderId ? "order_id" : "drone_id";
    const filterVal = orderId ?? droneId;

    supabase
      .from("telemetry")
      .select("*")
      .eq(filterCol, filterVal)
      .order("recorded_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          console.error("telemetry fetch failed:", error);
        }
        if (data && data.length > 0) {
          const rows = data as Telemetry[];
          // Draw entire path
          const latlngs = rows.map(
            (r) => [r.lat, r.lng] as L.LatLngExpression
          );
          polyline.setLatLngs(latlngs);

          // Position drone at last known location
          const last = rows[rows.length - 1];
          updateDrone(last);
          fitBoundsOnce({ lat: last.lat, lng: last.lng });
        } else {
          // No telemetry
          fitBoundsOnce();
        }
      });

    // Subscribe to Realtime (skip for terminal orders)
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    if (!isTerminal) {
      const channel = supabase
        .channel("telemetry-" + droneId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "telemetry",
            filter: `${filterCol}=eq.${filterVal}`,
          },
          (payload) => {
            const row = payload.new as Telemetry;
            updateDrone(row);
          }
        )
        .subscribe((status) => {
          onConnectionChange(status === "SUBSCRIBED");
        });

      channelRef = channel;
    }

    return () => {
      // Cleanup
      if (channelRef) {
        supabase.removeChannel(channelRef);
      }
      if (droneMarkerRef.current) {
        droneMarkerRef.current.remove();
        droneMarkerRef.current = null;
      }
      polyline.remove();
      polylineRef.current = null;
    };
    // Run once on mount — all dependencies are stable identifiers/coordinates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ── Overlay component ───────────────────────────────────────────────────────

function batteryColor(pct: number): string {
  if (pct > 50) return "text-green-600";
  if (pct >= 20) return "text-amber-600";
  return "text-red-600";
}

function Overlay({
  data,
  connected,
  fallbackStatus,
}: {
  data: TelemetryOverlay | null;
  connected: boolean;
  fallbackStatus?: string;
}) {
  const isTerminal = TERMINAL_STATUSES.includes(fallbackStatus ?? "");

  return (
    <div className="absolute bottom-3 right-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
      {!connected && !isTerminal && (
        <p className="text-xs text-amber-600 mb-1">Reconnecting…</p>
      )}

      {isTerminal ? (
        <p className="text-xs font-medium text-slate-600">Mission complete</p>
      ) : !data ? (
        <p className="text-xs text-muted-foreground">Waiting for telemetry…</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Speed</span>
          <span className="font-medium text-right">
            {data.speed_ms != null ? `${data.speed_ms.toFixed(1)} m/s` : "—"}
          </span>
          <span className="text-muted-foreground">Alt</span>
          <span className="font-medium text-right">
            {Math.round(data.alt)} m
          </span>
          <span className="text-muted-foreground">Battery</span>
          <span
            className={`font-medium text-right ${batteryColor(data.battery_pct)}`}
          >
            {data.battery_pct}%
          </span>
          <span className="text-muted-foreground">Mode</span>
          <span className="font-mono font-medium text-right">
            {data.flight_mode ?? "—"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function LiveDroneMap({
  droneId,
  orderId,
  hospitalLatLng,
  dropoffLatLng,
  hospitalName,
  dropoffAddress,
  fallbackStatus,
}: Props) {
  const [overlay, setOverlay] = useState<TelemetryOverlay | null>(null);
  const [connected, setConnected] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 h-[250px] sm:h-[400px]">
      <MapContainer
        center={[hospitalLatLng.lat, hospitalLatLng.lng]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[hospitalLatLng.lat, hospitalLatLng.lng]}
          icon={hospitalIcon}
        >
          <Popup>{hospitalName ?? "Hospital"} (Origin)</Popup>
        </Marker>
        <Marker position={[dropoffLatLng.lat, dropoffLatLng.lng]}>
          <Popup>{dropoffAddress ?? "Delivery Location"}</Popup>
        </Marker>
        {/* Invisible polyline placeholder — actual polyline managed imperatively */}
        <Polyline positions={[]} />
        <MapController
          droneId={droneId}
          orderId={orderId}
          hospitalLatLng={hospitalLatLng}
          dropoffLatLng={dropoffLatLng}
          fallbackStatus={fallbackStatus}
          onOverlayChange={setOverlay}
          onConnectionChange={setConnected}
        />
      </MapContainer>

      <Overlay
        data={overlay}
        connected={connected}
        fallbackStatus={fallbackStatus}
      />
    </div>
  );
}
