"use client";

import { useState, useEffect } from "react";
import { Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DroneLiveVideo } from "@/components/DroneLiveVideo";
import type { CameraToken } from "@/lib/livekit";

const FLYING_STATUSES = ["in_flight", "returning"];
const LANDED_STATUSES = ["arrived", "delivered"];

export function DroneCameraFeed({
  orderStatus,
  droneName,
  liveCamera,
}: {
  orderStatus: string;
  droneName?: string;
  /** Set when the drone streams its camera to LiveKit; getToken is a bound server action. */
  liveCamera?: { droneId: string; getToken: () => Promise<CameraToken> } | null;
}) {
  const isFlying = FLYING_STATUSES.includes(orderStatus);
  const isLanded = LANDED_STATUSES.includes(orderStatus);

  if (!isFlying && !isLanded) return null;

  // Overlay: drone name + clock
  const overlay = (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
      <span className="text-xs font-medium text-white/90">
        {droneName ?? "Drone"} — {isFlying ? "In Flight" : "Landed"}
      </span>
      <FeedClock />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Video className="size-4" />
          Drone Camera Feed
          {isFlying && <LiveBadge />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {liveCamera ? (
          <>
            <DroneLiveVideo droneId={liveCamera.droneId} getToken={liveCamera.getToken}>
              {overlay}
            </DroneLiveVideo>
            <p className="text-xs text-muted-foreground">
              Live from the drone&apos;s Raspberry Pi door camera.
            </p>
          </>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                src="/drone-feed.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full"
                style={{ maxHeight: 320 }}
              />
              {overlay}
            </div>
            <p className="text-xs text-muted-foreground">
              Simulated camera feed: this drone has not reported a live camera.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function LiveBadge() {
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
      <span className="size-1.5 animate-pulse rounded-full bg-white" />
      Live
    </span>
  );
}

function FeedClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <span className="font-mono text-xs text-white/80" suppressHydrationWarning>
      {fmt.format(now)}
    </span>
  );
}
