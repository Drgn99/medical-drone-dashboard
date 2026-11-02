#!/usr/bin/env python3
"""
Raspberry Pi 5 servo listener for the medical drone dashboard.

Watches the Supabase `drone_commands` table for servo commands sent from the
dashboard (Drones page -> "Test servo"), moves the servo, and reports back.

  python3 servo_listener.py          # listen for dashboard commands
  python3 servo_listener.py --local  # wiring test only, no Supabase needed

Config (env vars or a .env file next to this script):
  SUPABASE_URL               https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY  service role key (keep it on the Pi only)
  DRONE_ID                   the drone's UUID from the dashboard
  SERVO_PIN                  BCM pin number, default 18 (physical pin 12)
  SERVO_OPEN_ANGLE           default 90
  SERVO_CLOSED_ANGLE         default 0
  CAMERA_URL                 optional public HLS URL of the camera stream,
                             e.g. https://drone-pi.tailxxxx.ts.net/cam/index.m3u8
                             (see README.md). Reported to the dashboard.
"""

import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SERVO_COMMANDS = ("servo_open", "servo_close", "servo_test")
POLL_SECONDS = 1.0
HEARTBEAT_SECONDS = 5.0


def load_env_file():
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Servo ───────────────────────────────────────────────────────────────────

class Servo:
    def __init__(self, pin, open_angle, closed_angle):
        # The Pi 5 needs the lgpio backend; RPi.GPIO does not work on it.
        from gpiozero import AngularServo
        from gpiozero.pins.lgpio import LGPIOFactory

        self.open_angle = open_angle
        self.closed_angle = closed_angle
        # 0.5–2.5 ms pulse covers most hobby servos (SG90, MG90S, MG996R).
        self.servo = AngularServo(
            pin,
            min_angle=0,
            max_angle=180,
            min_pulse_width=0.0005,
            max_pulse_width=0.0025,
            pin_factory=LGPIOFactory(),
        )
        self.servo.detach()

    def move(self, angle, hold=0.8):
        self.servo.angle = angle
        time.sleep(hold)      # give it time to reach the position
        self.servo.detach()   # stop the PWM signal so it doesn't jitter

    def open(self):
        self.move(self.open_angle)
        return f"opened to {self.open_angle}°"

    def close(self):
        self.move(self.closed_angle)
        return f"closed to {self.closed_angle}°"

    def test(self):
        self.open()
        time.sleep(1.0)
        self.close()
        return f"opened to {self.open_angle}° then closed to {self.closed_angle}°"

    def run(self, command_type):
        if command_type == "servo_open":
            return self.open()
        if command_type == "servo_close":
            return self.close()
        if command_type == "servo_test":
            return self.test()
        raise ValueError(f"unknown command {command_type}")


# ── Local wiring test ───────────────────────────────────────────────────────

def local_test(servo):
    log("Local test: open / close three times. Ctrl+C to stop.")
    for i in range(3):
        log(f"  cycle {i + 1}: {servo.open()}")
        time.sleep(1)
        log(f"  cycle {i + 1}: {servo.close()}")
        time.sleep(1)
    log("Done. If nothing moved, check power, ground and the signal pin.")


# ── Supabase listener ───────────────────────────────────────────────────────

def listen(servo):
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    drone_id = os.environ.get("DRONE_ID")
    camera_url = os.environ.get("CAMERA_URL")
    missing = [n for n, v in [("SUPABASE_URL", url),
                              ("SUPABASE_SERVICE_ROLE_KEY", key),
                              ("DRONE_ID", drone_id)] if not v]
    if missing:
        sys.exit(f"Missing config: {', '.join(missing)}")

    db = create_client(url, key)

    drone = db.table("drones").select("id, name").eq("id", drone_id).execute()
    if not drone.data:
        sys.exit(f"No drone with id {drone_id} in Supabase. Copy the ID from the dashboard.")
    log(f"Listening for servo commands for '{drone.data[0]['name']}'. Ctrl+C to stop.")

    heartbeat = {}
    if camera_url:
        heartbeat["camera_url"] = camera_url
        log(f"Camera stream: {camera_url}")

    last_heartbeat = 0.0
    while True:
        try:
            if time.time() - last_heartbeat > HEARTBEAT_SECONDS:
                db.table("drones").update({**heartbeat, "last_seen": now_iso()}).eq("id", drone_id).execute()
                last_heartbeat = time.time()

            pending = (
                db.table("drone_commands")
                .select("id, command_type")
                .eq("drone_id", drone_id)
                .eq("status", "pending")
                .in_("command_type", list(SERVO_COMMANDS))
                .order("created_at")
                .execute()
            )

            for cmd in pending.data:
                log(f"Received {cmd['command_type']} ({cmd['id'][:8]})")
                try:
                    result = servo.run(cmd["command_type"])
                    status = "done"
                    log(f"  ok: {result}")
                except Exception as exc:  # report hardware errors to the dashboard
                    result = str(exc)
                    status = "failed"
                    log(f"  failed: {result}")

                db.table("drone_commands").update({
                    "status": status,
                    "acked_at": now_iso(),
                    "payload": {"result": result},
                }).eq("id", cmd["id"]).execute()

        except KeyboardInterrupt:
            raise
        except Exception as exc:
            log(f"Supabase error, retrying: {exc}")
            time.sleep(3)

        time.sleep(POLL_SECONDS)


def main():
    load_env_file()
    servo = Servo(
        pin=int(os.environ.get("SERVO_PIN", "18")),
        open_angle=float(os.environ.get("SERVO_OPEN_ANGLE", "90")),
        closed_angle=float(os.environ.get("SERVO_CLOSED_ANGLE", "0")),
    )
    try:
        if "--local" in sys.argv:
            local_test(servo)
        else:
            listen(servo)
    except KeyboardInterrupt:
        log("Stopping.")
    finally:
        servo.servo.close()


if __name__ == "__main__":
    main()
