# Raspberry Pi 5 companion computer

The Pi rides in the payload box. `bridge.py` is the whole drone program:
Supabase <-> MAVLink missions, the door servo (GPIO 17, locked 90° /
unlocked 180°), the door camera (live through LiveKit) and AI obstacle
detection. Full background, wiring and test results are in the team's
"Medical Drone Pi Code and Setup" and "LiveKit Handover" documents.

| File | Goes to | What it is |
|---|---|---|
| `bridge.py` | Pi: `/home/pi/bridge.py` | The drone program |
| `drone-bridge.service` | Pi: `/etc/systemd/system/` | Starts `bridge.py --watch` on boot |
| `setup-service.sh` | Pi: `~/` | One-time: installs and starts the service |
| `set-env.ps1` | Windows PC | Writes the Supabase settings into `~/drone.env` (keeps the LiveKit lines) |
| `set-livekit.ps1` | Windows PC | Writes the LiveKit settings into `~/drone.env` (keeps the rest; checks the values first) |
| `copy-key.ps1` | Windows PC | Copies the PC's SSH key to the Pi |
| `ardupilot-avoidance-camera.param` | Mission Planner -> FC | Avoidance fed by the Pi camera AI (current choice) |
| `ardupilot-avoidance.param` | Mission Planner -> FC | Alternative: TF-Luna LiDAR |

`~/drone.env` on the Pi holds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`DRONE_ID`, `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
Never commit it.

## Live camera (LiveKit)

```
Pi camera --(outgoing WebRTC)--> LiveKit Cloud --> dashboard (staff)
  room "drone-<drones.id>"         (wss://)    --> patient tracking page
```

- The Pi only connects out: no tunnel, no VPN, nothing opened on the Pi.
  LiveKit project `drone-cam` (EU Frankfurt).
- Whoever owns the camera (the watcher between missions, the mission process
  during a flight) publishes it as track `door-camera`, 640×480 at 15 fps,
  identity `drone-<drones.id>`. During a mission the AI boxes are drawn in.
  A new publisher with the same identity replaces the old one.
- The website joins the same room watch-only with a 1-hour token made on its
  server (`src/lib/livekit.ts`). Staff: drones of their hospital. Patient
  tracking page: that order's drone while it is `in_flight`, `arrived` or
  `delivered`. No recording.
- On the same Wi-Fi the camera is also at `http://drone.local:8000/` (MJPEG,
  10 fps per viewer): a backup for testing, not used by the website.

## What `bridge.py --watch` does

- Flies orders the dashboard dispatches to this drone (one process per mission).
- Between missions:
  - keeps the camera on and published to LiveKit;
  - runs the dashboard's **Test servo** button (Open = unlock 180°,
    Close = lock 90°, Open then close), checked every 0.5 s;
  - updates the drone's `last_seen` every 3 s.

## Website settings (once)

In cloud.livekit.io -> project `drone-cam` -> Settings -> API keys, create a
separate key for the website (do not reuse the Pi's key). Then set, in
`.env.local` and the hosting provider (Production + Preview):

```
NEXT_PUBLIC_LIVEKIT_URL=wss://....livekit.cloud
LIVEKIT_API_KEY=API...
LIVEKIT_API_SECRET=...
```

and restart the website. `supabase/add_servo_commands.sql` (already run on the
live project) lets the Test servo commands and the Pi's replies through the
`drone_commands` check constraints.

## Updating the Pi to a new bridge.py

From the folder with the new file on the PC, then on the Pi. Propellers off.

```powershell
scp bridge.py pi@drone.local:~/
```

```bash
~/drone/bin/python ~/bridge.py --selftest      # -> selftest ok
sudo systemctl restart drone-bridge
journalctl -u drone-bridge -f
```

The log should show `watching Supabase for dispatched orders (drone ...)`,
`camera live at http://<pi-ip>:8000/` and `livekit: camera live in room drone-...`.

## Setting up a Pi from scratch

1. Raspberry Pi Imager -> Raspberry Pi 5 -> Raspberry Pi OS (64-bit).
   Customisation: hostname `drone`, user `pi`, Wi-Fi (country OM), SSH on.
2. Fit the Active Cooler, RTC battery on BAT, camera on CAM/DISP 0 (Pi off).
3. On the PC: create an SSH key, run `copy-key.ps1`.
4. On the Pi:

   ```bash
   sudo apt update
   sudo apt install -y python3-picamera2 python3-gpiozero python3-lgpio python3-venv
   python3 -m venv --system-site-packages ~/drone
   ~/drone/bin/pip install pymavlink onnxruntime livekit livekit-api
   mkdir -p ~/models && cd ~/models
   curl -L -o model-small.onnx https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx
   curl -L -o yolo11n.onnx https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.onnx
   sudo raspi-config nonint do_serial_cons 1
   sudo raspi-config nonint do_serial_hw 0
   echo "dtparam=uart0=on" | sudo tee -a /boot/firmware/config.txt
   sudo reboot
   ```

5. Copy `bridge.py`, `drone-bridge.service` and `setup-service.sh` to
   `/home/pi/`. On the PC run `set-env.ps1`, then `set-livekit.ps1`.
6. On the Pi: `~/drone/bin/python ~/bridge.py --selftest`, then
   `bash ~/setup-service.sh`.

## Other commands (on the Pi)

| Command | What it does |
|---|---|
| `~/drone/bin/python bridge.py --door-test` | Latch locked -> unlocked -> locked, then one photo (`test.jpg`). Props off. |
| `~/drone/bin/python bridge.py --vision-test` | 10 minutes of live AI; watch `http://drone.local:8000/` or the dashboard |
| `~/drone/bin/python bridge.py <orderId>` | Fly one order by hand |
| `... <orderId> --connect udpin:0.0.0.0:14550 --no-box` | Against ArduPilot SITL on a laptop |

Stop the service first (`sudo systemctl stop drone-bridge`) before running
these: only one program can use the camera and the servo at a time.

## Safety and privacy

- The service is always on, so **Dispatch** on an order for this drone starts
  a mission. Keep the ELRS transmitter on with a LOITER/LAND switch, test in
  SITL first, then on the bench with propellers off.
- The camera sees patients at their door: no recording, no public links.
- The Pi holds the Supabase service_role key and its own LiveKit API secret in
  `~/drone.env` (chmod 600). Fine for the prototype; never commit or share it.
