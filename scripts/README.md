# Mock Drone Simulator

Simulates a complete drone delivery flight by pushing telemetry rows to
Supabase over time, updating order and drone status at each stage.

## Prerequisites

Env vars in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service role key bypasses RLS so the script can update orders, drones,
and insert telemetry as if it were the drone hardware.

## Usage

```bash
npm run simulator -- <orderId>
```

The order must be in `pending` or `dispatched` status with a drone assigned.

## What it does

1. Loads the order and its hospital coordinates from Supabase
2. Computes a 40-point straight-line flight path from hospital to dropoff
3. **Outbound flight** (40 seconds):
   - Updates order status: pending → dispatched → in_flight
   - Inserts one telemetry row per second with realistic altitude ramp
     (takeoff/landing), cruise speed (12 m/s), and battery drain (100% → 70%)
   - Updates drone position on each tick
4. **Arrival**: sets order to `arrived`, drone to `delivering`
5. **Waits for OTP**: polls the order every 2s for up to 5 minutes, waiting
   for the patient to enter the OTP code on the `/track/[orderId]` page
6. **Return flight** (40 seconds): reverse path back to hospital, battery
   drains from 70% → 45%
7. **Mission complete**: order set to `returned`, drone set to `idle` at
   hospital coordinates

Ctrl+C at any point returns the drone to idle and exits cleanly.

## Full demo flow

1. Start the dev server: `npm run dev`
2. Log in and create a new order (assign a drone, pick a dropoff location)
3. Note the order ID from the URL: `/dashboard/orders/<orderId>`
4. In a second terminal, run: `npm run simulator -- <orderId>`
5. Open the order detail page — watch the live map update in real time
6. Open the patient tracking page (`/track/<orderId>`) — watch the drone fly
7. When the drone arrives, enter the OTP code on the tracking page
8. Watch the simulator log the OTP verification and begin the return flight
9. Mission completes when the drone lands back at the hospital
