import "server-only";
import { AccessToken } from "livekit-server-sdk";

export type CameraToken =
  | { ok: true; url: string; token: string }
  | { ok: false; error: string };

/** Order statuses in which the patient may watch: on the way, landed at their door, handing over. */
export const PATIENT_CAMERA_STATUSES = ["in_flight", "arrived", "delivered"];

/** One LiveKit room per drone. pi/bridge.py publishes to the same name. */
export function droneRoom(droneId: string) {
  return `drone-${droneId}`;
}

// NEXT_PUBLIC_LIVEKIT_URL is the name used in the Pi team's handover (and Vercel); LIVEKIT_URL also works.
function liveKitUrl() {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
}

/** True when the server can hand out camera tokens. */
export function isLiveKitConfigured() {
  return Boolean(liveKitUrl() && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

/** Short-lived, watch-only token for a drone's camera room. */
export async function createViewerToken(droneId: string): Promise<CameraToken> {
  const url = liveKitUrl();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return { ok: false, error: "LiveKit is not configured on the server" };
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `viewer-${crypto.randomUUID()}`,
    ttl: "1h",
  });
  at.addGrant({
    room: droneRoom(droneId),
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: false,
  });

  return { ok: true, url, token: await at.toJwt() };
}
