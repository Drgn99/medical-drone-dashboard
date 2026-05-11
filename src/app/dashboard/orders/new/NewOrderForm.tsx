"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MapPin, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { LocationPickerDynamic } from "@/components/LocationPickerDynamic";
import { createOrder } from "@/lib/actions/orders";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Drone, Patient } from "@/types/database";

const schema = z.object({
  patient_id: z.string().min(1, "Select a patient"),
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
  payload_weight_grams: z
    .number({ message: "Enter a number" })
    .min(100, "Minimum 100 g")
    .max(1500, "Maximum 1500 g"),
  drone_id: z.string().min(1, "Select a drone"),
});

type FormValues = z.infer<typeof schema>;

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed";

// ── Patient combobox ──────────────────────────────────────────────────────────

function PatientCombobox({
  patients,
  value,
  onChange,
}: {
  patients: Patient[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = patients.find((p) => p.id === value) ?? null;

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.civil_id ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q)
    );
  });

  // Auto-focus search input when dropdown opens (focus is a DOM side-effect, not setState)
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("li[data-item]");
    const el = items[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        selectPatient(filtered[highlightIndex]);
      }
    }
  }

  function selectPatient(patient: Patient) {
    onChange(patient.id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef}>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!open) setHighlightIndex(0);
            setOpen((o) => !o);
          }}
          className="h-9 w-full justify-between font-normal"
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected ? selected.full_name : "Select a patient…"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-hidden">
            <div className="border-b border-slate-200 p-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search by name, civil ID, or phone…"
                className="w-full rounded-md bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              <ul ref={listRef} className="py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No patients found
                  </li>
                ) : (
                  filtered.map((patient, i) => (
                    <li
                      key={patient.id}
                      data-item=""
                      className={cn(
                        "flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
                        i === highlightIndex ? "bg-slate-100" : "hover:bg-slate-50"
                      )}
                      onMouseEnter={() => setHighlightIndex(i)}
                      onClick={() => selectPatient(patient)}
                    >
                      <span>
                        <span className="font-medium">{patient.full_name}</span>
                        <span className="ml-2 text-muted-foreground">
                          · {patient.civil_id ?? "—"} · {patient.phone ?? "—"}
                        </span>
                      </span>
                      {patient.id === value && (
                        <Check className="size-4 shrink-0 text-blue-600" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function NewOrderForm({
  drones,
  patients,
  defaultPatientId,
}: {
  drones: Drone[];
  patients: Patient[];
  defaultPatientId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    defaultPatientId
      ? (patients.find((p) => p.id === defaultPatientId) ?? null)
      : null
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patient_id: defaultPatientId ?? "",
    },
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
      {/* Patient selection — overflow-visible so the combobox dropdown can float out */}
      <Card className="overflow-visible">
        <CardContent className="space-y-4 pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Patient
          </h2>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Patient *</Label>
              <Link
                href="/dashboard/patients/new"
                target="_blank"
                className="text-xs text-blue-600 hover:underline"
              >
                + New Patient
              </Link>
            </div>
            <Controller
              control={control}
              name="patient_id"
              render={({ field }) => (
                <PatientCombobox
                  patients={patients}
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    setSelectedPatient(patients.find((p) => p.id === id) ?? null);
                  }}
                />
              )}
            />
            {errors.patient_id && (
              <p className="text-xs text-destructive">
                {errors.patient_id.message}
              </p>
            )}
          </div>

          {selectedPatient && (
            <div className="space-y-1 rounded-lg border border-input bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium">{selectedPatient.full_name}</p>
              <p className="text-muted-foreground">
                Civil ID: {selectedPatient.civil_id ?? "—"}
              </p>
              <p className="text-muted-foreground">
                Email: {selectedPatient.email ?? "—"}
              </p>
              <p className="text-muted-foreground">
                Phone: {selectedPatient.phone ?? "—"}
              </p>
            </div>
          )}
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
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
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
            <Label htmlFor="payload_weight_grams">Weight (grams) *</Label>
            <Input
              id="payload_weight_grams"
              type="number"
              min={100}
              max={1500}
              placeholder="100 – 1500"
              {...register("payload_weight_grams", { valueAsNumber: true })}
            />
            {errors.payload_weight_grams && (
              <p className="text-xs text-destructive">
                {errors.payload_weight_grams.message}
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
