"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Fix default Leaflet marker icons when bundled by webpack/turbopack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  onChange: (latlng: LatLng) => void;
  defaultCenter?: LatLng;
}

function MapEventHandler({
  onMapClick,
  onMapReady,
}: {
  onMapClick: (latlng: LatLng) => void;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  // Call onMapReady once when the map mounts. onMapReady is setState from the
  // parent — it's stable — so excluding it from deps is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onMapReady(map); }, [map]);

  return null;
}

export default function LocationPicker({
  onChange,
  defaultCenter = { lat: 23.5859, lng: 58.4059 },
}: Props) {
  const [marker, setMarker] = useState<LatLng | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function handleMapClick(latlng: LatLng) {
    setMarker(latlng);
    onChange(latlng);
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !map) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`
      );
      const results = await res.json();
      if (results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        map.setView([lat, lng], 14);
      }
    } catch {
      // Silently fail — user can still click the map
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search address…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={handleSearch}>
          Search
        </Button>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-input"
        style={{ height: 300 }}
      >
        <MapContainer
          center={[defaultCenter.lat, defaultCenter.lng]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventHandler onMapClick={handleMapClick} onMapReady={setMap} />
          {marker && <Marker position={[marker.lat, marker.lng]} />}
        </MapContainer>
      </div>

      {marker ? (
        <p className="text-xs text-muted-foreground">
          Selected: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Click the map to select a dropoff location.
        </p>
      )}
    </div>
  );
}
