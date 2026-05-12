"use client";

import { useWatch, type Control } from "react-hook-form";
import {
  User,
  MapPin,
  Package,
  Plane,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Drone, Patient } from "@/types/database";

interface FormValues {
  patient_id: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address?: string;
  payload_description: string;
  payload_weight_grams: number;
  drone_id: string;
  _drone_max_payload?: number | null;
  _drone_name?: string;
}

function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
  ) : (
    <Circle className="size-3.5 text-slate-300 shrink-0" />
  );
}

export function OrderPreviewCard({
  control,
  patients,
  drones,
}: {
  control: Control<FormValues>;
  patients: Patient[];
  drones: Drone[];
}) {
  const values = useWatch({
    control,
    name: [
      "patient_id",
      "dropoff_lat",
      "dropoff_lng",
      "dropoff_address",
      "payload_description",
      "payload_weight_grams",
      "drone_id",
    ],
  });

  const [
    patientId,
    dropoffLat,
    dropoffLng,
    dropoffAddress,
    payloadDesc,
    payloadWeight,
    droneId,
  ] = values;

  const patient = patientId
    ? (patients.find((p) => p.id === patientId) ?? null)
    : null;
  const drone = droneId
    ? (drones.find((d) => d.id === droneId) ?? null)
    : null;

  const maxPayload = drone?.max_payload_grams ?? 1500;

  const hasPatient = !!patient;
  const hasLocation = dropoffLat != null && !isNaN(dropoffLat);
  const hasPayloadDesc = !!payloadDesc?.trim();
  const hasPayloadWeight =
    payloadWeight != null &&
    !isNaN(payloadWeight) &&
    payloadWeight >= 10 &&
    payloadWeight <= maxPayload;
  const hasDrone = !!drone;

  return (
    <div className="sticky top-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Order Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Patient */}
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <User className="size-3.5" /> Patient
            </p>
            {patient ? (
              <div>
                <p className="font-medium">{patient.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.email ?? "No email"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No patient selected yet
              </p>
            )}
          </div>

          {/* Dropoff */}
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="size-3.5" /> Dropoff
            </p>
            {hasLocation ? (
              <div>
                <p className="font-mono text-xs">
                  {Number(dropoffLat).toFixed(5)}, {Number(dropoffLng).toFixed(5)}
                </p>
                {dropoffAddress && (
                  <p className="text-xs text-muted-foreground truncate">
                    {dropoffAddress}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Click map to select location
              </p>
            )}
          </div>

          {/* Payload */}
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Package className="size-3.5" /> Payload
            </p>
            {hasPayloadDesc || hasPayloadWeight ? (
              <div>
                {hasPayloadDesc && (
                  <p className="font-medium truncate">{payloadDesc}</p>
                )}
                {hasPayloadWeight && (
                  <p className="text-xs text-muted-foreground">
                    {payloadWeight} g
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Not specified
              </p>
            )}
          </div>

          {/* Drone */}
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Plane className="size-3.5" /> Assigned Drone
            </p>
            {drone ? (
              <div>
                <p className="font-medium">{drone.name}</p>
                <p className="text-xs text-muted-foreground">
                  Battery: {drone.battery_pct ?? "—"}%
                  {drone.max_payload_grams != null &&
                    ` · Max payload: ${drone.max_payload_grams} g`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Not assigned
              </p>
            )}
          </div>

          {/* Validation summary */}
          <div className="border-t pt-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Checklist
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <StatusDot ok={hasPatient} />
                <span className={hasPatient ? "text-slate-700" : "text-slate-400"}>
                  Patient selected
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <StatusDot ok={hasLocation} />
                <span className={hasLocation ? "text-slate-700" : "text-slate-400"}>
                  Dropoff location
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <StatusDot ok={hasPayloadDesc} />
                <span className={hasPayloadDesc ? "text-slate-700" : "text-slate-400"}>
                  Payload description
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <StatusDot ok={hasPayloadWeight} />
                <span className={hasPayloadWeight ? "text-slate-700" : "text-slate-400"}>
                  Payload weight
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <StatusDot ok={hasDrone} />
                <span className={hasDrone ? "text-slate-700" : "text-slate-400"}>
                  Drone assigned
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
