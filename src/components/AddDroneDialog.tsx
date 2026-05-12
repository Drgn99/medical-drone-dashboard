"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { addDrone } from "@/lib/actions/drones";
import { buttonVariants } from "@/components/ui/button";
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

export function AddDroneDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [maxPayload, setMaxPayload] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseInt(weightGrams, 10);
    const mp = parseInt(maxPayload, 10);
    if (!name.trim() || isNaN(w) || isNaN(mp)) return;

    startTransition(async () => {
      const result = await addDrone({
        name,
        weight_grams: w,
        max_payload_grams: mp,
      });
      if (result.success) {
        toast.success("Drone added successfully");
        setOpen(false);
        setName("");
        setWeightGrams("");
        setMaxPayload("");
      } else {
        toast.error(result.error ?? "Failed to add drone");
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
      <button
        onClick={() => setOpen(true)}
        className={buttonVariants({ variant: "default" })}
      >
        <Plus className="mr-1 size-4" />
        Add Drone
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Drone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} id="add-drone-form" className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-drone-name">Drone name</Label>
              <Input
                id="add-drone-name"
                placeholder="e.g. Drone-02"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-drone-weight">Weight (grams)</Label>
                <Input
                  id="add-drone-weight"
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
                <Label htmlFor="add-drone-maxpayload">Max Payload (grams)</Label>
                <Input
                  id="add-drone-maxpayload"
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
            <Button
              type="submit"
              form="add-drone-form"
              disabled={isPending || !isValid}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add Drone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
