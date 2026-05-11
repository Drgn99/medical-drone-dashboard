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
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await addDrone({ name });
      if (result.success) {
        toast.success("Drone added successfully");
        setOpen(false);
        setName("");
      } else {
        toast.error(result.error ?? "Failed to add drone");
      }
    });
  }

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
            <div className="space-y-2">
              <Label htmlFor="drone-name">Drone name</Label>
              <Input
                id="drone-name"
                placeholder="e.g. Drone-02"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="add-drone-form"
              disabled={isPending || !name.trim()}
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
