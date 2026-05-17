"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { requestHospitalAccess } from "@/lib/actions/staff";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function RequestAccessForm() {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;

    startTransition(async () => {
      const result = await requestHospitalAccess({ full_name: name });
      if (result.success) {
        toast.success("Access requested");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to submit request");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name *</Label>
        <Input
          id="full_name"
          placeholder="e.g. Ahmed Al-Balushi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <Button
        type="submit"
        disabled={isPending || name.trim().length < 2}
        className="w-full"
      >
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Request Access
      </Button>
    </form>
  );
}
