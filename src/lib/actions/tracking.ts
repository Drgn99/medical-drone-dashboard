"use server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  createViewerToken,
  PATIENT_CAMERA_STATUSES,
  type CameraToken,
} from "@/lib/livekit";

/**
 * Camera token for the public tracking page. Anyone with the tracking link can
 * watch, but only that order's drone and only in PATIENT_CAMERA_STATUSES.
 */
export async function getTrackingCameraToken(orderId: string): Promise<CameraToken> {
  const { data: order } = await createServiceClient()
    .from("orders")
    .select("drone_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.drone_id || !PATIENT_CAMERA_STATUSES.includes(order.status)) {
    return { ok: false, error: "No live camera for this order" };
  }
  return createViewerToken(order.drone_id);
}
