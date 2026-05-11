"use client";

import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { LocationPickerDynamic } from "@/components/LocationPickerDynamic";
import { createOrder } from "@/lib/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Drone } from "@/types/database";

const schema = z.object({
  patient_name: z.string().min(1, "Patient name is required"),
  patient_email: z.string().email("Enter a valid email"),
  patient_phone: z.string().optional(),
  dropoff_lat: z
    .number({ message: "Select a location on the map" })
    .min(-90)
    .max(90),
  dropoff_lng: z
    .number({ message: "Select a location on the map" })
    .min(-180)
    .max(180),
  dropoff_address: z.string().optional(),
  payload_description: z.string().min(1, "Payload description is required"),
  payload_weight: z
    .number({ message: "Enter a number" })
    .min(100, "Minimum 100 g")
    .max(1500, "Maximum 1500 g"),
  drone_id: z.string().min(1, "Select a drone"),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed";

export function NewOrderForm({ drones }: { drones: Drone[] }) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data.display_name) {
        setValue("dropoff_address", data.display_name);
      }
    } catch {
      // Ignore — address field stays empty
    }
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await createOrder(data);
      // createOrder redirects on success; we only reach here on error
      if (result && !result.success) {
        toast.error(result.error ?? "Failed to create order");
      }
    });
  }

  const idleDrones = drones.filter((d) => d.status === "idle");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Patient info */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Patient Information
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="patient_name">Patient name *</Label>
            <Input
              id="patient_name"
              placeholder="Full name"
              {...register("patient_name")}
            />
            {errors.patient_name && (
              <p className="text-xs text-destructive">
                {errors.patient_name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="patient_email">Email *</Label>
              <Input
                id="patient_email"
                type="email"
                placeholder="patient@example.com"
                {...register("patient_email")}
              />
              {errors.patient_email && (
                <p className="text-xs text-destructive">
                  {errors.patient_email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient_phone">Phone (optional)</Label>
              <Input
                id="patient_phone"
                type="tel"
                placeholder="+968 ..."
                {...register("patient_phone")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dropoff location */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="flex items-center gap-2">
              <MapPin className="size-4" /> Dropoff Location
            </span>
          </h2>

          <Controller
            control={control}
            name="dropoff_lat"
            render={() => (
              <LocationPickerDynamic
                onChange={({ lat, lng }) => {
                  setValue("dropoff_lat", lat, { shouldValidate: true });
                  setValue("dropoff_lng", lng, { shouldValidate: true });
                  reverseGeocode(lat, lng);
                }}
              />
            )}
          />
          {errors.dropoff_lat && (
            <p className="text-xs text-destructive">
              {errors.dropoff_lat.message}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="dropoff_address">Address (auto-filled)</Label>
            <input
              id="dropoff_address"
              className={inputClass}
              placeholder="Reverse geocoded from map selection"
              readOnly
              {...register("dropoff_address")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payload */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Payload
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="payload_description">Description *</Label>
            <Textarea
              id="payload_description"
              placeholder="e.g. AED, First aid kit, Blood samples"
              {...register("payload_description")}
            />
            {errors.payload_description && (
              <p className="text-xs text-destructive">
                {errors.payload_description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payload_weight">Weight (grams) *</Label>
            <Input
              id="payload_weight"
              type="number"
              min={100}
              max={1500}
              placeholder="100 – 1500"
              {...register("payload_weight", { valueAsNumber: true })}
            />
            {errors.payload_weight && (
              <p className="text-xs text-destructive">
                {errors.payload_weight.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drone assignment */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Assigned Drone
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="drone_id">Drone *</Label>
            <select
              id="drone_id"
              className={selectClass}
              {...register("drone_id")}
            >
              <option value="">Select a drone</option>
              {drones.map((drone) => (
                <option
                  key={drone.id}
                  value={drone.id}
                  disabled={drone.status !== "idle"}
                >
                  {drone.name}
                  {drone.status !== "idle" ? ` (${drone.status})` : ""}
                </option>
              ))}
            </select>
            {idleDrones.length === 0 && (
              <p className="text-xs text-amber-600">
                No idle drones available. All drones are currently in use.
              </p>
            )}
            {errors.drone_id && (
              <p className="text-xs text-destructive">
                {errors.drone_id.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Create Order
      </Button>
    </form>
  );
}
