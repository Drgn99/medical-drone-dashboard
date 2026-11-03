# Raspberry Pi 5 companion computer

The Pi rides in the payload box. `bridge.py` is the whole drone program:
Supabase <-> MAVLink missions, the door servo (GPIO 17, locked 90° /
unlocked 180°), the door camera (MJPEG on port 8000) and AI obstacle
detection. Full background, wiring and test results are in the team's
"Medical Drone Pi Code and Setup" document.

| File | Goes to | What it is |
|---|---|---|
| `bridge.py` | Pi: `/home/pi/bridge.py` | The drone program |
| `drone-bridge.service` | Pi: `/etc/systemd/system/` | Starts `bridge.py --watch` on boot |
| `ardupilot-avoidance-camera.param` | Mission Planner -> FC | Avoidance fed by the Pi camera AI (current choice) |
| `ardupilot-avoidance.param` | Mission Planner -> FC | Alternative: TF-Luna LiDAR |
| `set-env.ps1` | Windows PC | Writes `~/drone.env` on the Pi (key hidden while typing) |
| `copy-key.ps1` | Windows PC | Copies the PC's SSH key to the Pi |

`~/drone.env` on the Pi holds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`DRONE_ID` and optionally `CAMERA_URL`. Never commit it.

## What `bridge.py --watch` does

- Flies orders the dashboard dispatches to this drone (one process per mission).
- Between missions:
  - keeps the camera stream running on port 8000, so the dashboard can show it;
  - runs the dashboard's **Test servo** button (Open = unlock 180°,
    Close = lock 90°, Open then close);
  - updates the drone's `last_seen` (and `camera_url`) every 3 s.
- When a mission starts, the watcher hands the camera to the mission (which
  also needs it for obstacle detection). The dashboard reconnects by itself
  after a few seconds and then shows the AI boxes too.

## Updating a Pi that is already set up

Run these from the project folder on the Windows PC unless it says "on the Pi".

1. **Database (once):** in the Supabase SQL Editor run
   `supabase/add_drone_camera_url.sql`.

2. **Stop anything from the old approach (on the Pi),** if you installed it:

   ```bash
   sudo systemctl disable --now mediamtx 2>/dev/null
   pkill -f servo_listener.py
   ```

3. **Copy the new files:**

   ```powershell
   scp pi/bridge.py pi/drone-bridge.service pi@drone.local:~/
   ```

4. **Self-check (on the Pi):**

   ```bash
   ~/drone/bin/python ~/bridge.py --selftest    # -> selftest ok
   ```

5. **Public camera address with Tailscale Funnel (on the Pi):**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up            # open the printed link, sign in
   sudo tailscale funnel --bg 8000
   tailscale funnel status
   ```

   The first `funnel` command may print a link to turn Funnel on for your
   tailnet: open it, approve, run the command again. `funnel status` shows an
   address like `https://drone.tailxxxx.ts.net`.

6. **Add the camera address to `~/drone.env` (on the Pi)** (use your address,
   keep the `/` at the end):

   ```bash
   echo "CAMERA_URL=https://drone.tailxxxx.ts.net/" >> ~/drone.env
   ```

   Or run `set-env.ps1` again on the PC; it now asks for the camera URL as
   step 4/4.

7. **Start or restart the service (on the Pi):**

   ```bash
   sudo cp ~/drone-bridge.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable drone-bridge
   sudo systemctl restart drone-bridge
   journalctl -u drone-bridge -f
   ```

   The log should show `watching Supabase for dispatched orders (drone ...)`
   and `camera live at http://<pi-ip>:8000/`.

8. **Test from the dashboard,** propellers off:
   - Drones page -> **Camera**: live video within a few seconds.
   - Drones page -> **Test servo** -> Open / Close / Open, then close. The
     latch should move and the dialog should report the result. The log shows
     `dashboard servo command: ...`.
   - "Last seen" for the drone should say "less than a minute ago".

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
   ~/drone/bin/pip install pymavlink onnxruntime
   mkdir -p ~/models && cd ~/models
   curl -L -o model-small.onnx https://github.com/isl-org/MiDaS/releases/download/v2_1/model-small.onnx
   curl -L -o yolo11n.onnx https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.onnx
   sudo raspi-config nonint do_serial_cons 1
   sudo raspi-config nonint do_serial_hw 0
   echo "dtparam=uart0=on" | sudo tee -a /boot/firmware/config.txt
   sudo reboot
   ```

5. Run `set-env.ps1` on the PC, then steps 3-8 above.

## Other commands (on the Pi)

| Command | What it does |
|---|---|
| `~/drone/bin/python bridge.py --door-test` | Latch locked -> unlocked -> locked, then one photo (`test.jpg`). Props off. |
| `~/drone/bin/python bridge.py --vision-test` | 10 minutes of live AI; watch `http://drone.local:8000/` |
| `~/drone/bin/python bridge.py <orderId>` | Fly one order by hand |
| `... <orderId> --connect udpin:0.0.0.0:14550 --no-box` | Against ArduPilot SITL on a laptop |

Stop the service first (`sudo systemctl stop drone-bridge`) before running
these: only one program can use the camera and the servo at a time.

## Safety and privacy

- Once the service runs, a **Dispatch** click can make the drone take off.
  Keep the ELRS transmitter on with a LOITER/LAND switch, test in SITL first,
  then on the bench with propellers off.
- Anyone who has the Funnel address can watch the camera. Turn it off with
  `sudo tailscale funnel reset`.
- The stream is 640x480 JPEG at 15 fps, roughly 3-5 Mbit/s per viewer over
  the hotspot. Close the camera window when you don't need it.
