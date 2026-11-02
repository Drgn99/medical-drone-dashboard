"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type Hls from "hls.js";
import { Loader2, VideoOff } from "lucide-react";

type StreamState = "connecting" | "playing" | "offline";

const RETRY_MS = 5000;

/**
 * Plays the Pi's MediaMTX HLS stream. hls.js where supported, native HLS
 * (Safari/iOS) otherwise. Keeps retrying while the stream is offline.
 */
export function DroneLiveVideo({
  src,
  maxHeight = 320,
  children,
}: {
  src: string;
  maxHeight?: number;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<StreamState>("connecting");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function scheduleRetry() {
      if (cancelled) return;
      setState("offline");
      retryTimer = setTimeout(start, RETRY_MS);
    }

    function onPlaying() {
      setState("playing");
    }

    function onNativeError() {
      if (hls) return; // hls.js reports its own errors
      video!.removeAttribute("src");
      video!.load();
      scheduleRetry();
    }

    async function start() {
      hls?.destroy();
      hls = null;

      const { default: HlsLib } = await import("hls.js");
      if (cancelled) return;

      if (HlsLib.isSupported()) {
        hls = new HlsLib({ lowLatencyMode: true });
        hls.on(HlsLib.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            hls?.destroy();
            hls = null;
            scheduleRetry();
          }
        });
        hls.loadSource(src);
        hls.attachMedia(video!);
      } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        video!.src = src;
      } else {
        setState("offline");
        return;
      }

      video!.play().catch(() => {
        // Autoplay can be blocked until the stream has data; "playing" fires later.
      });
    }

    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onNativeError);
    start();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onNativeError);
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        className="w-full"
        style={{ maxHeight, minHeight: 180 }}
      />

      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-white/80">
          {state === "connecting" ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Connecting to drone camera…
            </>
          ) : (
            <>
              <VideoOff className="size-5" />
              Camera offline. Retrying…
            </>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
