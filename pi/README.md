# Raspberry Pi 5 setup

Two things run on the Pi:

- `servo_listener.py`: moves the payload servo when the dashboard asks, and
  reports the drone's heartbeat (and camera URL) to Supabase.
- MediaMTX: streams the Pi Camera Module as low-latency HLS. Tailscale Funnel
  gives it a public HTTPS address so the dashboard can play it from anywhere.

Use 64-bit Raspberry Pi OS (Bookworm).

## 1. Settings

```bash
cp .env.example .env
nano .env
```

Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DRONE_ID` (copy the
ID from the dashboard). `CAMERA_URL` comes in step 4.

## 2. Servo listener

```bash
sudo apt install -y python3-gpiozero python3-lgpio
pip install --break-system-packages supabase
python3 servo_listener.py --local   # wiring test
python3 servo_listener.py           # listen for dashboard commands
```

## 3. Camera stream (MediaMTX)

Check the camera works first:

```bash
rpicam-hello -t 5000
```

Download the `linux_arm64` build of MediaMTX from
https://github.com/bluenviron/mediamtx/releases and unpack it next to this
README, then start it with the config in this folder:

```bash
tar xzf mediamtx_*_linux_arm64.tar.gz mediamtx
./mediamtx mediamtx.yml
```

On the Pi itself, http://localhost:8888/cam/ now shows the video.

To start it on boot, create `/etc/systemd/system/mediamtx.service`
(change `/home/pi/pi` to wherever this folder is):

```ini
[Unit]
Description=MediaMTX camera stream
After=network-online.target

[Service]
WorkingDirectory=/home/pi/pi
ExecStart=/home/pi/pi/mediamtx /home/pi/pi/mediamtx.yml
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now mediamtx
```

## 4. Public address (Tailscale Funnel)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale funnel --bg 8888
```

The first `funnel` command prints a link to turn Funnel on for your tailnet;
open it, approve, and run the command again. Then:

```bash
tailscale funnel status
```

shows an address like `https://drone-pi.tailxxxx.ts.net`. Put the stream URL
in `.env`:

```
CAMERA_URL=https://drone-pi.tailxxxx.ts.net/cam/index.m3u8
```

Restart `servo_listener.py`. It reports the URL to Supabase, and the dashboard
plays it on the Drones page ("Camera") and on the order and tracking pages.

Anyone who has this URL can watch the stream.
