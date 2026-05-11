import { formatDistanceToNow } from "date-fns";
import { Plane } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { AddDroneDialog } from "@/components/AddDroneDialog";
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
                      <span className="cursor-not-allowed text-xs text-muted-foreground/50">
                        View
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Plane className="mb-3 size-8 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No drones yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Add your first drone to get started.
          </p>
        </div>
      )}
    </div>
  );
}
