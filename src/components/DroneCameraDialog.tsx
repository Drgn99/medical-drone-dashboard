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

export function DroneCameraDialog({
  droneName,
  cameraUrl,
}: {
  droneName: string;
  cameraUrl: string | null;
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
              {cameraUrl && <LiveBadge />}
            </DialogTitle>
            <DialogDescription>
              Live video from the Raspberry Pi camera. Expect a delay of a few
              seconds.
            </DialogDescription>
          </DialogHeader>

          {cameraUrl ? (
            <DroneLiveVideo src={cameraUrl} maxHeight={480} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This drone hasn&apos;t reported a camera yet. On the Pi, set{" "}
              <code className="font-mono text-xs">CAMERA_URL</code> in{" "}
              <code className="font-mono text-xs">pi/.env</code> and restart{" "}
              <code className="font-mono text-xs">servo_listener.py</code> (see{" "}
              <code className="font-mono text-xs">pi/README.md</code>).
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
