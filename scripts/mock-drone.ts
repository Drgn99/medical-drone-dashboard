/**
 * Mock Drone Simulator
 *
 * Simulates a complete drone delivery flight by pushing telemetry rows
 * to Supabase over time, updating order + drone status at each stage.
 *
 * Usage: npm run simulator -- <orderId>
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Order } from "../src/types/database";

// ── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(msg: string) {
  const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
  console.log(`[${t}] ${msg}`);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Supabase client ─────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ── Flight math ─────────────────────────────────────────────────────────────

const TICKS = 40;
const CRUISE_ALT = 30;
const CRUISE_SPEED = 12;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function computeBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function altitude(tick: number): number {
  if (tick < 10) return (tick / 9) * CRUISE_ALT;
  if (tick >= TICKS - 10) return ((TICKS - 1 - tick) / 9) * CRUISE_ALT;
  return CRUISE_ALT;
}

function speed(tick: number): number {
  if (tick === 0 || tick === TICKS - 1) return 0;
  return CRUISE_SPEED;
}

function flightMode(tick: number): string {
  if (tick >= TICKS - 3) return "LAND";
  return "AUTO";
}

function generatePath(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  for (let i = 0; i < TICKS; i++) {
    const t = i / (TICKS - 1);
    points.push({ lat: lerp(startLat, endLat, t), lng: lerp(startLng, endLng, t) });
  }
  return points;
}

// ── Status update helpers ───────────────────────────────────────────────────

async function updateOrderStatus(orderId: string, status: string, extra?: Record<string, unknown>) {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ status, ...extra })
      .eq("id", orderId);
    if (error) log(`  ⚠ order status update failed: ${error.message}`);
  } catch (e) {
    log(`  ⚠ order status update error: ${e}`);
  }
}

async function updateDroneStatus(droneId: string, status: string, extra?: Record<string, unknown>) {
  try {
    const { error } = await supabase
      .from("drones")
      .update({ status, last_seen: new Date().toISOString(), ...extra })
      .eq("id", droneId);
    if (error) log(`  ⚠ drone status update failed: ${error.message}`);
  } catch (e) {
    log(`  ⚠ drone status update error: ${e}`);
  }
}

async function insertTelemetry(row: {
  drone_id: string;
  order_id: string;
  lat: number;
  lng: number;
  alt: number;
  battery_pct: number;
  speed_ms: number;
  heading_deg: number;
  flight_mode: string;
}) {
  try {
    const { error } = await supabase.from("telemetry").insert({
      ...row,
      recorded_at: new Date().toISOString(),
    });
    if (error) log(`  ⚠ telemetry insert failed: ${error.message}`);
  } catch (e) {
    log(`  ⚠ telemetry insert error: ${e}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const orderId = process.argv[2];

  if (!orderId) {
    console.error("Usage: npm run simulator -- <orderId>");
    process.exit(1);
  }
  if (!UUID_RE.test(orderId)) {
    console.error(`Invalid UUID: "${orderId}"`);
    process.exit(1);
  }

  // Load order with hospital join
  log(`Starting mission for order ${orderId.slice(-8).toUpperCase()}`);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, hospitals!inner(latitude, longitude)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error(`Order not found: ${orderError?.message ?? "no data"}`);
    process.exit(1);
  }

  const typedOrder = order as Order & {
    hospitals: { latitude: number | null; longitude: number | null };
  };

  if (!["pending", "dispatched"].includes(typedOrder.status)) {
    console.error(
      `Order is not in a dispatchable state (current: ${typedOrder.status})`
    );
    process.exit(1);
  }

  if (!typedOrder.drone_id) {
    console.error("Order has no drone assigned (drone_id is null)");
    process.exit(1);
  }

  const hospitalLat = typedOrder.hospitals.latitude;
  const hospitalLng = typedOrder.hospitals.longitude;

  if (hospitalLat == null || hospitalLng == null) {
    console.error("Hospital has no coordinates configured");
    process.exit(1);
  }

  if (typedOrder.dropoff_lat == null || typedOrder.dropoff_lng == null) {
    console.error("Order has no dropoff coordinates");
    process.exit(1);
  }

  const droneId = typedOrder.drone_id;
  const dropoffLat = typedOrder.dropoff_lat;
  const dropoffLng = typedOrder.dropoff_lng;

  // ── SIGINT handler ──────────────────────────────────────────────────────
  let aborted = false;
  process.on("SIGINT", async () => {
    if (aborted) process.exit(1);
    aborted = true;
    log("Abort requested. Returning drone to idle…");
    await updateDroneStatus(droneId, "idle", {
      current_lat: hospitalLat,
      current_lng: hospitalLng,
      current_alt: 0,
    });
    log("Aborted by user. Drone returned to idle state.");
    process.exit(0);
  });

  // ── Compute paths ───────────────────────────────────────────────────────
  const outboundPath = generatePath(hospitalLat, hospitalLng, dropoffLat, dropoffLng);
  const returnPath = generatePath(dropoffLat, dropoffLng, hospitalLat, hospitalLng);
  const outboundHeading = computeBearing(hospitalLat, hospitalLng, dropoffLat, dropoffLng);
  const returnHeading = computeBearing(dropoffLat, dropoffLng, hospitalLat, hospitalLng);

  log(
    `Flight plan: ${TICKS} ticks outbound, heading ${outboundHeading.toFixed(0)}°`
  );
  log(
    `  Hospital: ${hospitalLat.toFixed(5)}, ${hospitalLng.toFixed(5)}`
  );
  log(
    `  Dropoff:  ${dropoffLat.toFixed(5)}, ${dropoffLng.toFixed(5)}`
  );

  // ── Outbound flight ─────────────────────────────────────────────────────

  // Step 1: pending → dispatched (if pending)
  if (typedOrder.status === "pending") {
    await updateOrderStatus(orderId, "dispatched", {
      dispatched_at: new Date().toISOString(),
    });
    log("Status: pending → dispatched");
    await sleep(2000);
  }

  // Step 2: dispatched → in_flight
  await updateOrderStatus(orderId, "in_flight");
  await updateDroneStatus(droneId, "in_flight");
  log("Status: dispatched → in_flight, launching from hospital");

  // Step 3: fly outbound
  for (let i = 0; i < TICKS; i++) {
    if (aborted) return;

    const point = outboundPath[i];
    const alt = altitude(i);
    const spd = speed(i);
    const mode = flightMode(i);
    const batt = Math.round(lerp(100, 70, i / (TICKS - 1)));

    await insertTelemetry({
      drone_id: droneId,
      order_id: orderId,
      lat: point.lat,
      lng: point.lng,
      alt,
      battery_pct: batt,
      speed_ms: spd,
      heading_deg: outboundHeading,
      flight_mode: mode,
    });

    // Update drone position
    await updateDroneStatus(droneId, "in_flight", {
      current_lat: point.lat,
      current_lng: point.lng,
      current_alt: alt,
      battery_pct: batt,
    });

    if (i % 5 === 0 || i === TICKS - 1) {
      log(
        `Tick ${i + 1}/${TICKS}, lat=${point.lat.toFixed(4)}, lng=${point.lng.toFixed(4)}, alt=${alt.toFixed(0)}, battery=${batt}%`
      );
    }

    await sleep(1000);
  }

  // Step 4: arrived
  await updateOrderStatus(orderId, "arrived");
  await updateDroneStatus(droneId, "delivering", {
    current_lat: dropoffLat,
    current_lng: dropoffLng,
    current_alt: 0,
  });
  log("Arrived at dropoff. Waiting for OTP verification…");

  // ── Wait for OTP ────────────────────────────────────────────────────────

  const MAX_POLLS = 150; // 150 × 2s = 5 minutes
  let delivered = false;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (aborted) return;

    const { data: check, error: checkError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (checkError) {
      log(`  ⚠ poll error: ${checkError.message}`);
    } else if (check?.status === "delivered") {
      delivered = true;
      break;
    }

    if (i > 0 && i % 15 === 0) {
      log(`  Still waiting for OTP… (${i * 2}s elapsed)`);
    }

    await sleep(2000);
  }

  if (!delivered) {
    log("Timeout: no OTP verification after 5 minutes. Aborting mission.");
    await updateDroneStatus(droneId, "idle", {
      current_lat: dropoffLat,
      current_lng: dropoffLng,
      current_alt: 0,
    });
    process.exit(1);
  }

  log("OTP verified! Beginning return flight.");

  // ── Return flight ───────────────────────────────────────────────────────

  await updateDroneStatus(droneId, "returning");

  for (let i = 0; i < TICKS; i++) {
    if (aborted) return;

    const point = returnPath[i];
    const alt = altitude(i);
    const spd = speed(i);
    const mode = flightMode(i);
    const batt = Math.round(lerp(70, 45, i / (TICKS - 1)));

    await insertTelemetry({
      drone_id: droneId,
      order_id: orderId,
      lat: point.lat,
      lng: point.lng,
      alt,
      battery_pct: batt,
      speed_ms: spd,
      heading_deg: returnHeading,
      flight_mode: mode,
    });

    await updateDroneStatus(droneId, "returning", {
      current_lat: point.lat,
      current_lng: point.lng,
      current_alt: alt,
      battery_pct: batt,
    });

    if (i % 5 === 0 || i === TICKS - 1) {
      log(
        `Return ${i + 1}/${TICKS}, lat=${point.lat.toFixed(4)}, lng=${point.lng.toFixed(4)}, alt=${alt.toFixed(0)}, battery=${batt}%`
      );
    }

    await sleep(1000);
  }

  // ── Mission complete ────────────────────────────────────────────────────

  await updateOrderStatus(orderId, "returned");
  await updateDroneStatus(droneId, "idle", {
    current_lat: hospitalLat,
    current_lng: hospitalLng,
    current_alt: 0,
    battery_pct: 45,
  });

  log("Mission complete. Drone idle at hospital.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
