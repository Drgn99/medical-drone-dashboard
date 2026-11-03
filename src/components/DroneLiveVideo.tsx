"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Room } from "livekit-client";
import { Loader2, VideoOff } from "lucide-react";
import type { CameraToken } from "@/lib/livekit";

type StreamState = "connecting" | "waiting" | "playing" | "offline";

const RETRY_MS = 5000;

/**
 * Plays a drone's camera from LiveKit (WebRTC). pi/bridge.py publishes the
 * door camera to the room "drone-<id>"; this joins it watch-only with a token
 * from `getToken` (a server action) and reconnects by itself.
 */
export function DroneLiveVideo({
  droneId,
  getToken,
  maxHeight = 320,
  children,
}: {
  droneId: string;
  getToken: () => Promise<CameraToken>;
  maxHeight?: number;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const getTokenRef = useRef(getToken);
  const [state, setState] = useState<StreamState>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let stopped = false;
    let current: Room | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function retryLater() {
      if (stopped) return;
      setState("offline");
      retryTimer = setTimeout(connect, RETRY_MS);
    }

    async function connect() {
      if (stopped) return;
      const { Room, RoomEvent, Track } = await import("livekit-client");

      let res: CameraToken;
      try {
        res = await getTokenRef.current();
      } catch {
        res = { ok: false, error: "Could not reach the server" };
      }
      if (stopped) return;
      if (!res.ok) {
        setError(res.error);
        retryLater();
        return;
      }
      setError(null);

      const room = new Room({ adaptiveStream: true });
      current = room;

      const hasVideo = () =>
        Array.from(room.remoteParticipants.values()).some((p) =>
          Array.from(p.videoTrackPublications.values()).some((pub) => pub.isSubscribed)
        );

      room
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && videoRef.current) {
            track.attach(videoRef.current);
            setState("playing");
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
          if (!hasVideo()) setState("waiting"); // e.g. the camera is being handed to a mission
        })
        .on(RoomEvent.Disconnected, () => {
          if (current === room) {
            current = null;
            retryLater();
          }
        });

      try {
        await room.connect(res.url, res.token);
      } catch {
        if (current === room) {
          current = null;
          room.disconnect();
          retryLater();
        }
        return;
      }
      if (stopped) {
        room.disconnect();
        return;
      }
      if (!hasVideo()) setState("waiting");
    }

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      const room = current;
      current = null;
      room?.disconnect();
    };
  }, [droneId]);

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-black"
      style={{ minHeight: 180 }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`mx-auto block w-full object-contain ${state === "playing" ? "" : "invisible"}`}
        style={{ maxHeight }}
      />

      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-white/80">
          {state === "offline" ? (
            <>
              <VideoOff className="size-5" />
              Camera offline. Retrying…
              {error && <span className="text-white/50">{error}</span>}
            </>
          ) : (
            <>
              <Loader2 className="size-5 animate-spin" />
              {state === "connecting"
                ? "Connecting to drone camera…"
                : "Waiting for the drone camera…"}
            </>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
