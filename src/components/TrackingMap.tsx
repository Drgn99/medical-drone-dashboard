"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons when bundled by webpack/turbopack
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
  // Tint blue via CSS filter — no extra dep needed
  className: "hue-rotate-[220deg]",
});

interface Props {
  hospitalLat: number;
  hospitalLng: number;
  hospitalName: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string | null;
}

function BoundsController({
  hospitalLat,
  hospitalLng,
  dropoffLat,
  dropoffLng,
}: Pick<Props, "hospitalLat" | "hospitalLng" | "dropoffLat" | "dropoffLng">) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(
      [hospitalLat, hospitalLng],
      [dropoffLat, dropoffLng]
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  // Run once on mount — props are static for a given order
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function TrackingMap({
  hospitalLat,
  hospitalLng,
  hospitalName,
  dropoffLat,
  dropoffLng,
  dropoffAddress,
}: Props) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200"
      style={{ height: 280 }}
    >
      <MapContainer
        center={[hospitalLat, hospitalLng]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <BoundsController
          hospitalLat={hospitalLat}
          hospitalLng={hospitalLng}
          dropoffLat={dropoffLat}
          dropoffLng={dropoffLng}
        />
        <Marker position={[hospitalLat, hospitalLng]} icon={hospitalIcon}>
          <Popup>{hospitalName} (Origin)</Popup>
        </Marker>
        <Marker position={[dropoffLat, dropoffLng]}>
          <Popup>{dropoffAddress ?? "Delivery Location"}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
