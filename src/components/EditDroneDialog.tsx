"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { updateDrone } from "@/lib/actions/drones";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Drone } from "@/types/database";

export function EditDroneDialog({ drone }: { drone: Drone }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(drone.name);
  const [weightGrams, setWeightGrams] = useState(
    drone.weight_grams != null ? String(drone.weight_grams) : ""
  );
  const [maxPayload, setMaxPayload] = useState(
    drone.max_payload_grams != null ? String(drone.max_payload_grams) : ""
  );
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    // Reset to current drone values each time the dialog opens
    setName(drone.name);
    setWeightGrams(drone.weight_grams != null ? String(drone.weight_grams) : "");
    setMaxPayload(drone.max_payload_grams != null ? String(drone.max_payload_grams) : "");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseInt(weightGrams, 10);
    const mp = parseInt(maxPayload, 10);
    if (!name.trim() || isNaN(w) || isNaN(mp)) return;

    startTransition(async () => {
      const result = await updateDrone(drone.id, {
        name,
        weight_grams: w,
        max_payload_grams: mp,
      });
      if (result.success) {
        toast.success("Drone updated");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to update drone");
      }
    });
  }

  const isValid =
    name.trim().length > 0 &&
    parseInt(weightGrams, 10) >= 100 &&
    parseInt(weightGrams, 10) <= 5000 &&
    parseInt(maxPayload, 10) >= 50 &&
    parseInt(maxPayload, 10) <= 3000;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Pencil className="mr-1.5 size-3.5" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Drone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} id="edit-drone-form" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-drone-name">Drone name</Label>
              <Input
                id="edit-drone-name"
                placeholder="e.g. Drone-02"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-drone-weight">Weight (grams)</Label>
                <Input
                  id="edit-drone-weight"
                  type="number"
                  min={100}
                  max={5000}
                  placeholder="e.g. 950"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Empty weight including battery and companion computer (no payload)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-drone-maxpayload">Max Payload (grams)</Label>
                <Input
                  id="edit-drone-maxpayload"
                  type="number"
                  min={50}
                  max={3000}
                  placeholder="e.g. 500"
                  value={maxPayload}
                  onChange={(e) => setMaxPayload(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Maximum safe payload the drone can carry
                </p>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-drone-form"
              disabled={isPending || !isValid}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
