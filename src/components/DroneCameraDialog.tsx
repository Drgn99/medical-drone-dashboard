"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DroneLiveVideo } from "@/components/DroneLiveVideo";
import { LiveBadge } from "@/components/DroneCameraFeed";
import { getDroneCameraToken } from "@/lib/actions/drones";

export function DroneCameraDialog({
  droneId,
  droneName,
  liveKit,
}: {
  droneId: string;
  droneName: string;
  /** Whether the website has LiveKit settings (the Pi publishes to room drone-<id>). */
  liveKit: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Video className="mr-1.5 size-3.5" />
        Camera
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {droneName} camera
              {liveKit && <LiveBadge />}
            </DialogTitle>
            <DialogDescription>
              Live video from the Raspberry Pi door camera. During a mission
              it also shows the obstacle-detection boxes.
            </DialogDescription>
          </DialogHeader>

          {liveKit ? (
            <DroneLiveVideo
              droneId={droneId}
              getToken={() => getDroneCameraToken(droneId)}
              maxHeight={480}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              The live camera isn&apos;t set up on the website yet. Add{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_LIVEKIT_URL</code>,{" "}
              <code className="font-mono text-xs">LIVEKIT_API_KEY</code> and{" "}
              <code className="font-mono text-xs">LIVEKIT_API_SECRET</code> to the
              website&apos;s environment and restart it (see{" "}
              <code className="font-mono text-xs">pi/README.md</code>).
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
