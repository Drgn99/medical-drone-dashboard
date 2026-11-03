"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, VideoOff } from "lucide-react";

type StreamState = "connecting" | "playing" | "offline";

const RETRY_MS = 3000;
const STALL_MS = 8000;
const CRLF2 = [13, 10, 13, 10];

/**
 * Shows the MJPEG stream from the Pi's bridge.py (multipart JPEG frames with
 * Content-Length headers). Read with fetch() rather than <img src> so a stream
 * that ends or stalls (e.g. a mission taking over the camera) is noticed and
 * reconnected instead of freezing on the last frame.
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
  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<StreamState>("connecting");

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;
    let frameUrl: string | null = null;
    let lastFrame = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function showFrame(jpeg: Uint8Array<ArrayBuffer>) {
      const url = URL.createObjectURL(new Blob([jpeg], { type: "image/jpeg" }));
      if (imgRef.current) imgRef.current.src = url;
      if (frameUrl) URL.revokeObjectURL(frameUrl);
      frameUrl = url;
      if (lastFrame === 0) setState("playing");
      lastFrame = Date.now();
    }

    async function read(signal: AbortSignal) {
      const res = await fetch(src, { signal, cache: "no-store" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      let buf = new Uint8Array(0);

      for (;;) {
        const { value, done } = await reader.read();
        if (done) throw new Error("stream ended");
        buf = concat(buf, value);

        // Each part: "--F\r\nContent-Type: ...\r\nContent-Length: N\r\n\r\n" + N bytes of JPEG
        for (;;) {
          const headerEnd = indexOf(buf, CRLF2);
          if (headerEnd < 0) break;
          const header = new TextDecoder().decode(buf.subarray(0, headerEnd));
          const length = /content-length:\s*(\d+)/i.exec(header);
          const start = headerEnd + 4;
          if (!length) {
            buf = buf.slice(start);
            continue;
          }
          const end = start + Number(length[1]);
          if (buf.length < end) break;
          showFrame(buf.slice(start, end));
          buf = buf.slice(end);
        }
      }
    }

    function connect() {
      if (stopped) return;
      controller = new AbortController();
      lastFrame = 0;
      read(controller.signal).catch(() => {
        if (stopped) return;
        setState("offline");
        retryTimer = setTimeout(connect, RETRY_MS);
      });
    }

    // A connection that stops delivering frames is dropped and retried.
    const watchdog = setInterval(() => {
      if (lastFrame && Date.now() - lastFrame > STALL_MS) controller?.abort();
    }, 1000);

    connect();

    return () => {
      stopped = true;
      clearInterval(watchdog);
      if (retryTimer) clearTimeout(retryTimer);
      controller?.abort();
      if (frameUrl) URL.revokeObjectURL(frameUrl);
    };
  }, [src]);

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-black"
      style={{ minHeight: 180 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- frames are blob: URLs */}
      <img
        ref={imgRef}
        alt="Live drone camera"
        className={`mx-auto w-full object-contain ${state === "playing" ? "" : "invisible"}`}
        style={{ maxHeight }}
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

function concat(a: Uint8Array<ArrayBuffer>, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function indexOf(haystack: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}
