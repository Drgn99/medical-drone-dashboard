import { formatDistanceToNow } from "date-fns";
import { Plane } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { AddDroneDialog } from "@/components/AddDroneDialog";
import { EditDroneDialog } from "@/components/EditDroneDialog";
import { RechargeDroneButton } from "@/components/RechargeDroneButton";
import { ServoTestDialog } from "@/components/ServoTestDialog";
import { DroneCameraDialog } from "@/components/DroneCameraDialog";
import { missingLiveKitSettings } from "@/lib/livekit";
import { DroneStatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Drone } from "@/types/database";

function BatteryBar({ value }: { value: number | null }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
        <div
          className={pct > 20 ? "h-full bg-green-500" : "h-full bg-red-500"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs">{pct}%</span>
    </div>
  );
}

export default async function DronesPage() {
  const liveKitMissing = missingLiveKitSettings();
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: drones, error: dronesError } = await supabase
    .from("drones")
    .select("*")
    .eq("hospital_id", ctx.hospital.id)
    .order("name");

  if (dronesError) {
    console.error("drones list failed:", dronesError);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Drones</h1>
        </div>
        <AddDroneDialog />
      </div>

      {drones && drones.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Empty Weight</TableHead>
                  <TableHead>Max Payload</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drones as Drone[]).map((drone, i) => (
                  <TableRow
                    key={drone.id}
                    className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                  >
                    <TableCell className="font-medium">{drone.name}</TableCell>
                    <TableCell>
                      <DroneStatusBadge status={drone.status} />
                    </TableCell>
                    <TableCell>
                      <BatteryBar value={drone.battery_pct} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {drone.weight_grams != null ? `${drone.weight_grams} g` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {drone.max_payload_grams != null ? `${drone.max_payload_grams} g` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {drone.last_seen
                        ? formatDistanceToNow(new Date(drone.last_seen), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {drone.current_lat != null && drone.current_lng != null
                        ? `${drone.current_lat.toFixed(4)}, ${drone.current_lng.toFixed(4)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <EditDroneDialog drone={drone} />
                        <RechargeDroneButton
                          droneId={drone.id}
                          droneName={drone.name}
                          droneStatus={drone.status}
                        />
                        <ServoTestDialog
                          droneId={drone.id}
                          droneName={drone.name}
                        />
                        <DroneCameraDialog
                          droneId={drone.id}
                          droneName={drone.name}
                          missingSettings={liveKitMissing}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-md my-12">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plane className="mb-4 size-12 text-slate-300" />
            <p className="text-lg font-semibold">No drones in fleet</p>
            <p className="mt-1 text-sm text-slate-600">
              Add a drone to start delivering.
            </p>
            <div className="mt-4">
              <AddDroneDialog />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
