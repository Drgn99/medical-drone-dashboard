#!/usr/bin/env python3
"""Raspberry Pi 5 MAVLink <-> Supabase bridge for the payload box v2.

Replaces `npm run simulator -- <orderId>` with the real drone. Same tables, same statuses:
  dispatched -> in_flight -> (land at patient) arrived -> (OTP ok) delivered -> returned
At the patient: land + disarm, wait for OTP, servo 0->90 unlocks the flap, recipient lifts it,
gravity closes it, after DOOR_OPEN_S servo 90->0 re-locks, take off, RTL.
No reed switch: the Pi cannot see the door, it trusts gravity + the timer.

Usage:
  python3 bridge.py --watch                  # on the drone: fly whatever the website dispatches;
                                             # between missions: camera stream + dashboard "Test servo"
  python3 bridge.py <orderId>                # fly one order by hand
  python3 bridge.py <orderId> --connect udpin:0.0.0.0:14550 --no-box  # ArduPilot SITL on a laptop
  python3 bridge.py --door-test              # bench: latch cycle + camera frame (props OFF)
  python3 bridge.py --selftest
Live door camera: http://<pi-ip>:8000/
"""
import argparse, http.server, io, json, math, os, socket, subprocess, sys, threading, time, urllib.request

from pymavlink import mavutil

# --- Supabase (set in the environment, never commit the key) ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/").removesuffix("/rest/v1")  # either form works
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRONE_ID = os.environ.get("DRONE_ID", "")  # this drone's uuid in `drones`; empty = take any dispatched order

# --- Phase A schema: checked against the live Supabase (2026-11-01) ---
ORDERS_TABLE, TELEMETRY_TABLE = "orders", "telemetry"
DROPOFF_LAT, DROPOFF_LNG = "dropoff_lat", "dropoff_lng"  # order columns for the map-picked dropoff
DRONE_COL = "drone_id"                                   # orders column with the assigned drone
DISPATCHED, IN_FLIGHT, ARRIVED, DELIVERED, RETURNED = "dispatched", "in_flight", "arrived", "delivered", "returned"

# --- Flight tuning knobs: test in SITL, then tune on the real airframe ---
CRUISE_ALT_M = 30        # same as the website's goto commands
ARRIVE_RADIUS_M = 3       # GPS is +-2 m on a good day, don't go lower
OTP_TIMEOUT_S = 300       # no OTP -> door stays locked, fly home with the pouch
DOOR_OPEN_S = 60          # after unlock: time for the recipient to lift the flap, take the pouch, let go
STAND_CLEAR_S = 10        # after re-lock, wait before arming: the recipient is next to the props
MIN_BATTERY_PCT = 30      # airborne below this -> RTL

# --- Obstacle avoidance: ArduPilot does the avoiding, the Pi feeds it a forward distance ---
# "camera": door camera + MiDaS depth model -> Pi sends DISTANCE_SENSOR (ardupilot-avoidance-camera.param)
# "lidar":  TF-Luna on the FC (ardupilot-avoidance.param), Pi only checks it.   None: off
OBSTACLE_SENSOR = "camera"
OBSTACLE_WARN_M = 6       # log when something is closer than this ahead
VISION_MODEL = os.path.expanduser("~/models/model-small.onnx")  # MiDaS v2.1 small, 256x256
VISION_K = 300.0          # start value only: re-learned live from YOLO objects of known size (see KNOWN_HEIGHT_M)
VISION_MAX_M = 8.0        # report "nothing" beyond this; prototype: camera depth is a guess, not a measurement
VISION_MIN_M = 0.2        # closest distance ArduPilot accepts (RNGFND1_MIN_CM = 20)
BLOCKED_CONTRAST = 12     # picture std-dev below this = no detail (a covered lens only fell to ~24: gain noise)
BLOCKED_LUX = 5.0         # camera light meter below this = lens covered/dark. Either one -> report VISION_MIN_M
YOLO_MODEL = os.path.expanduser("~/models/yolo11n.onnx")  # Ultralytics YOLO11n, 80 COCO classes
YOLO_SIZE = 416           # input px: 320 = 32 ms, 416 = 56 ms, 640 = 145 ms on a Pi 5
YOLO_CONF = 0.45          # ignore detections below this confidence
# Distance from size: metres = FOCAL_PX * real size / box size in px (pinhole camera).
FOCAL_PX = 643            # OV5647 at 640x480: 53.5 deg horizontal view. CALIBRATE: stand at 2.0 m, adjust until it says 2.0
KNOWN_SIZE_M = {  # label: (real metres, "h" = measure box height, "w" = width for wide flat things)
    "person": (1.70, "h"), "bicycle": (1.0, "h"), "car": (1.5, "h"), "motorcycle": (1.1, "h"), "bus": (3.0, "h"),
    "truck": (3.0, "h"), "dog": (0.5, "h"), "chair": (0.9, "h"), "couch": (0.85, "h"), "bed": (0.6, "h"),
    "bottle": (0.25, "h"), "cup": (0.10, "h"), "cell phone": (0.15, "h"), "potted plant": (0.5, "h"),
    "stop sign": (0.75, "h"), "keyboard": (0.44, "w"), "laptop": (0.33, "w"), "tv": (1.0, "w"), "mouse": (0.06, "w")}

# --- Payload box v2 (payload-box/v2/README.md, Wiring) ---
SERVO_GPIO = 17  # servo signal = pin 11
LOCKED_DEG, UNLOCKED_DEG = 90, 180  # bench 2026-11-02: horn sits locked at 90; unlock = same quarter turn as the design
SERVO_MIN_PULSE, SERVO_MAX_PULSE = 0.0005, 0.0025  # SG90/MG90S-ish: trim until the bar sits straight down at 0

# --- Door camera (Pi Camera Rev 1.3 in the door, mounted upside down) ---
CAM_PORT = 8000
CAM_SIZE = (640, 480)
CAM_FPS = 15                    # 30 fps + two AI models maxed the Pi 5 CPU (373%) and the stream stuttered
CAM_EV = 1.5                    # exposure boost for backlit faces; lower it if daylight photos look washed out
CAM_TUNING = "ov5647_noir.json" # this SUNNY Rev 1.3 clone: noir tuning gave neutral grey on a grey wall,
                                # stock ov5647.json gave green. Set None for a genuine Rev 1.3 with IR filter
PHOTO_BUCKET = "deliveries"     # Supabase Storage bucket: photo of the recipient at unlock
# Public address of the MJPEG stream (Tailscale Funnel -> CAM_PORT), shown on the dashboard. Optional.
CAMERA_URL = os.environ.get("CAMERA_URL", "").strip()
CAMERA_RETRY_S = 60             # --watch: try to reopen the camera this often if it failed
STREAM_FPS = 10                 # frames sent to each viewer: less than CAM_FPS so a hotspot/Funnel link keeps up
STREAM_SNDBUF = 64 * 1024       # small send buffer: a slow viewer drops frames instead of falling seconds behind

# --- Dashboard "Test servo" button (drone_commands rows), handled by --watch between missions ---
SERVO_COMMANDS = ("servo_open", "servo_close", "servo_test")
WATCH_TICK_S = 0.5              # --watch checks for servo commands this often (dashboard waits for the reply)
WATCH_ORDERS_S = 3              # ... and for dispatched orders / sends the heartbeat this often


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def dist_m(a, b):
    """Haversine distance in metres between (lat, lon) pairs."""
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def db(method, path, body=None):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"})
    with urllib.request.urlopen(req, timeout=5) as r:
        txt = r.read()
        return json.loads(txt) if txt else None


def safe_db(*a):
    # The hotspot WILL drop. Never let that crash the flight loop.
    try:
        return db(*a)
    except Exception as e:
        log("supabase error (continuing):", e)


def upload_photo(name, jpeg):
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"{SUPABASE_URL}/storage/v1/object/{PHOTO_BUCKET}/{name}", data=jpeg, method="POST",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
                     "Content-Type": "image/jpeg", "x-upsert": "true"}), timeout=10).close()
        log("photo uploaded:", f"{PHOTO_BUCKET}/{name}")
    except Exception as e:
        log("photo upload failed (continuing):", e)


class Box:
    """Servo latch. no_box=True fakes it (SITL / laptop)."""
    def __init__(self, no_box=False):
        self.fake = no_box
        if no_box:
            return
        from gpiozero import AngularServo  # gpiozero 2.x uses lgpio on the Pi 5
        # initial_angle=None: no pulse until latch() is called. The default (0) jerked the bar to 0 deg
        # every time a Box was made, before it moved to the real angle.
        self.servo = AngularServo(SERVO_GPIO, initial_angle=None, min_angle=0, max_angle=180,
                                  min_pulse_width=SERVO_MIN_PULSE, max_pulse_width=SERVO_MAX_PULSE)

    def latch(self, deg, wait=time.sleep):
        log("latch ->", "LOCKED" if deg == LOCKED_DEG else "UNLOCKED")
        if self.fake:
            return
        self.servo.angle = deg
        wait(0.6)
        self.servo.detach()  # the bar holds mechanically; no pulses = no jitter, no buzz

    def close(self):
        """Release GPIO 17 so another process (the mission) can drive the servo."""
        if not self.fake:
            self.servo.close()


def run_servo_command(box, kind, wait=time.sleep):
    """Dashboard servo test. Open = unlock, close = lock. Returns a short result for the dashboard."""
    if kind == "servo_open":
        box.latch(UNLOCKED_DEG)
        return f"unlocked ({UNLOCKED_DEG} deg)"
    if kind == "servo_close":
        box.latch(LOCKED_DEG)
        return f"locked ({LOCKED_DEG} deg)"
    if kind == "servo_test":
        box.latch(UNLOCKED_DEG)
        wait(1.0)
        box.latch(LOCKED_DEG)
        return f"unlocked ({UNLOCKED_DEG} deg) then locked ({LOCKED_DEG} deg)"
    raise ValueError(f"unknown servo command {kind}")


class Frames(io.BufferedIOBase):
    """Latest JPEG from the camera, shared between the encoder and HTTP viewers."""
    def __init__(self):
        self.frame, self.cond = None, threading.Condition()

    def write(self, buf):
        with self.cond:
            self.frame = bytes(buf)
            self.cond.notify_all()


def start_camera():
    """Door camera -> MJPEG on CAM_PORT. Returns Frames, or None if no camera (flight goes on)."""
    try:
        from libcamera import Transform
        from picamera2 import Picamera2
        from picamera2.encoders import JpegEncoder  # software JPEG: Pi 5 has no HW encoder
        from picamera2.outputs import FileOutput
        cam = Picamera2(tuning=Picamera2.load_tuning_file(CAM_TUNING) if CAM_TUNING else None)
        cam.configure(cam.create_video_configuration(  # rotate 180: ribbon edge is up in the door
            main={"size": CAM_SIZE}, transform=Transform(hflip=1, vflip=1),
            # door looks up at a face against bright sky: meter the centre, brighten (bench-tested)
            controls={"AeMeteringMode": 0, "ExposureValue": CAM_EV,  # 0 = CentreWeighted
                      "FrameRate": CAM_FPS}))
        frames = Frames()
        frames.cam = cam  # the vision thread grabs raw frames from it
        frames.dets, frames.hud, frames.vision_t = [], "", 0.0
        cam.post_callback = lambda req: draw_overlay(req, frames)  # after the AI's copy, before the encoder
        cam.start_recording(JpegEncoder(q=70), FileOutput(frames))
    except Exception as e:
        log("camera unavailable (continuing without it):", e)
        return None

    class Stream(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=F")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")  # the dashboard reads the stream with fetch()
            self.end_headers()
            self.connection.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, STREAM_SNDBUF)
            try:
                sent = 0.0
                while True:
                    with frames.cond:
                        if not frames.cond.wait(timeout=5):
                            return  # camera stopped (handed to a mission): end the stream, the viewer reconnects
                        f = frames.frame
                    if time.time() - sent < 1 / STREAM_FPS:
                        continue  # skip this frame; the next one will be fresher anyway
                    sent = time.time()
                    self.wfile.write(b"--F\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n" % len(f) + f + b"\r\n")
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, *a):
            pass

    srv = http.server.ThreadingHTTPServer(("", CAM_PORT), Stream)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    frames.srv = srv
    log(f"camera live at http://<pi-ip>:{CAM_PORT}/")
    return frames


def stop_camera(frames):
    """Free the camera and CAM_PORT so a mission process can open them."""
    frames.srv.shutdown()
    frames.srv.server_close()
    frames.cam.stop_recording()
    frames.cam.close()
    log("camera stopped")


def draw_overlay(req, frames):
    """YOLO boxes + depth readout burned into the video stream (and the delivery photo)."""
    if time.time() - frames.vision_t > 1:
        return  # AI not running or stale: show the plain picture
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    from picamera2 import MappedArray
    font = ImageFont.load_default(size=20)
    with MappedArray(req, "main") as ma:
        img = Image.fromarray(ma.array)
        d = ImageDraw.Draw(img)
        for label, conf, x0, y0, x1, y1, m in frames.dets:
            d.rectangle((x0, y0, x1, y1), outline=(255, 220, 0, 255), width=3)
            d.text((x0 + 5, y0 + 3), f"{label} {conf:.0%}" + (f"  {m:.1f} m" if m else ""),
                   fill=(255, 220, 0, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0, 255))
        y = CAM_SIZE[1] - 34  # bottom-left on a dark band, clear of the YOLO labels
        d.rectangle((0, y - 4, 260, CAM_SIZE[1]), fill=(0, 0, 0, 255))
        d.text((10, y), frames.hud, fill=(0, 255, 0, 255), font=font)
        ma.array[:] = np.asarray(img)


def box_iou(a, b):
    """Intersection over union of two (x0, y0, x1, y1) boxes."""
    iw = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    ih = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = iw * ih
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0.0


def nms(dets, iou=0.5):
    """Keep the most confident box; drop same-class boxes overlapping it. dets: (cls, conf, box)."""
    kept = []
    for d in sorted(dets, key=lambda d: -d[1]):
        if all(k[0] != d[0] or box_iou(k[2], d[2]) < iou for k in kept):
            kept.append(d)
    return kept


def closeness_to_m(close, k=VISION_K):
    """MiDaS gives inverse depth (bigger = nearer), so metres ~ k / value."""
    return VISION_MAX_M if close <= 0 else max(VISION_MIN_M, min(VISION_MAX_M, k / close))


def object_m(label, w_px, h_px):
    """Real distance of a known object from its box size. None if we don't know how big it is.
    A box cut off by the picture edge looks smaller -> reads FARTHER, so cut-off boxes are not trusted."""
    if label not in KNOWN_SIZE_M:
        return None
    real, axis = KNOWN_SIZE_M[label]
    px = h_px if axis == "h" else w_px
    return FOCAL_PX * real / px if px > 0 else None


def start_vision(frames, s):
    """Two AI models on the camera, ~5 fps together on a Pi 5:
    MiDaS depth -> s['vision_m'] (metres ahead, sent to ArduPilot); YOLO11n -> s['dets'] (what is there)."""
    import ast
    import numpy as np
    import onnxruntime as ort
    from PIL import Image
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 3  # leave 1 of the Pi's 4 cores for MAVLink, video and Supabase
    sess = ort.InferenceSession(VISION_MODEL, opts, providers=["CPUExecutionProvider"])
    name = sess.get_inputs()[0].name
    mean = np.array([0.485, 0.456, 0.406], np.float32).reshape(3, 1, 1)
    std = np.array([0.229, 0.224, 0.225], np.float32).reshape(3, 1, 1)
    ys = np.linspace(0, CAM_SIZE[1] - 1, 256).astype(int)
    xs = np.linspace(0, CAM_SIZE[0] - 1, 256).astype(int)
    ysess = ort.InferenceSession(YOLO_MODEL, opts, providers=["CPUExecutionProvider"])
    yname = ysess.get_inputs()[0].name
    names = ast.literal_eval(ysess.get_modelmeta().custom_metadata_map["names"])  # {0: 'person', ...}

    def yolo(rgb):
        h, w = rgb.shape[:2]
        r = YOLO_SIZE / max(h, w)
        nw, nh = round(w * r), round(h * r)
        left, top = (YOLO_SIZE - nw) // 2, (YOLO_SIZE - nh) // 2
        canvas = np.full((YOLO_SIZE, YOLO_SIZE, 3), 114, np.uint8)  # letterbox, grey padding
        canvas[top:top + nh, left:left + nw] = np.asarray(Image.fromarray(rgb).resize((nw, nh)))
        out = ysess.run(None, {yname: (canvas.astype(np.float32).transpose(2, 0, 1) / 255)[None]})[0][0].T
        scores = out[:, 4:]
        conf = scores.max(1)
        out, scores, conf = out[conf > YOLO_CONF], scores[conf > YOLO_CONF], conf[conf > YOLO_CONF]
        dets = []
        for (cx, cy, bw, bh), c, p in zip(out[:, :4], scores.argmax(1), conf):
            box = ((cx - bw / 2 - left) / r, (cy - bh / 2 - top) / r, (cx + bw / 2 - left) / r, (cy + bh / 2 - top) / r)
            dets.append((int(c), float(p), box))
        return [(names[c], p, *map(int, b)) for c, p, b in nms(dets)]

    def loop():
        while True:
            try:
                req = frames.cam.capture_request()  # picture + the camera's own light meter, same frame
                full, lux = req.make_array("main")[:, :, :3], float(req.get_metadata().get("Lux", 999))
                req.release()                       # XBGR8888 arrives as R,G,B,X
                x = (full[ys][:, xs].astype(np.float32).transpose(2, 0, 1) / 255 - mean) / std
                inv = sess.run(None, {name: x[None]})[0][0]
                close = float(np.percentile(inv[80:176, 80:176], 90))  # nearest stuff in the middle
                ratio = close / max(float(np.median(inv)), 1e-6)       # middle vs whole view
                dets = yolo(np.ascontiguousarray(full))
                contrast = float(full[::8, ::8].std())
                blocked = lux < BLOCKED_LUX or contrast < BLOCKED_CONTRAST  # covered / dark / no detail
                W, H = CAM_SIZE
                ahead, k = [], s.get("vision_k", VISION_K)
                for i, (label, conf, x0, y0, x1, y1) in enumerate(dets):
                    m_obj = object_m(label, x1 - x0, y1 - y0)
                    cut = x0 <= 2 or y0 <= 2 or x1 >= W - 3 or y1 >= H - 3
                    dets[i] = (label, conf, x0, y0, x1, y1, None if cut else m_obj)
                    if m_obj is None or cut:
                        continue
                    # a known object teaches the depth AI its scale: k = metres * MiDaS value on that object
                    gy0, gy1 = int(y0 * 256 / H), max(int(y1 * 256 / H), int(y0 * 256 / H) + 1)
                    gx0, gx1 = int(x0 * 256 / W), max(int(x1 * 256 / W), int(x0 * 256 / W) + 1)
                    v = float(np.median(inv[gy0:gy1, gx0:gx1]))
                    if v > 0:
                        k = 0.8 * k + 0.2 * min(max(m_obj * v, 30.0), 30000.0)  # smooth, sane range
                    if x0 < W * 176 / 256 and x1 > W * 80 / 256 and y0 < H * 176 / 256 and y1 > H * 80 / 256:
                        ahead.append(m_obj)  # known object in the middle of the view = straight ahead
                metres = VISION_MIN_M if blocked else max(VISION_MIN_M, min([closeness_to_m(close, k)] + ahead))
                s.update(vision_close=close, vision_ratio=ratio, vision_m=metres, vision_blocked=blocked,
                         vision_contrast=contrast, vision_lux=lux, vision_k=k, dets=dets, vision_t=time.time())
                frames.dets, frames.vision_t = dets, time.time()
                frames.hud = "CAMERA BLOCKED - STOP" if blocked else f"obstacle ahead ~{metres:.1f} m"
            except Exception as e:  # never kill the flight over a bad frame; stale data fails the check
                log("vision error:", e)
                time.sleep(1)

    threading.Thread(target=loop, daemon=True).start()
    log("camera obstacle detection running")


def vision_test():
    """Bench: print what the camera thinks is ahead. Use it to set VISION_K."""
    s = {}
    frames = start_camera()
    if not frames:
        sys.exit("no camera")
    start_vision(frames, s)
    for i in range(1200):  # 10 minutes; watch it live at http://drone.local:8000/
        time.sleep(0.5)
        if "vision_t" in s:
            seen = ", ".join(f"{d[0]} {d[1]:.0%}" + (f" {d[6]:.1f}m" if d[6] else "") for d in s["dets"]) or "-"
            log(f"close={s['vision_close']:7.1f}  contrast={s['vision_contrast']:5.1f}  lux={s['vision_lux']:6.1f}"
                f"  k={s['vision_k']:6.0f}  ~{s['vision_m']:.1f} m"
                f"{'  BLOCKED' if s['vision_blocked'] else ''}  | {seen}")
        if i % 10 == 9 and frames.frame:
            open(f"vision_{i // 10}.jpg", "wb").write(frames.frame)  # what it was looking at
    frames.cam.stop_recording()


def watch(a):
    """Run forever: when the website dispatches an order to this drone, fly it."""
    q = f"{ORDERS_TABLE}?status=eq.{DISPATCHED}&select=id"
    if DRONE_ID:
        q += f"&{DRONE_COL}=eq.{DRONE_ID}"
    tried = set()  # never retry an order that failed pre-flight: fix it and dispatch a new one
    log("watching Supabase for dispatched orders", f"(drone {DRONE_ID})" if DRONE_ID else "")
    if not DRONE_ID:
        log("WARNING: no DRONE_ID, so no heartbeat, camera link or dashboard servo test")
    # Between missions the watcher owns the camera, so the dashboard can watch it; a mission takes it over.
    frames, cam_tried = start_camera(), time.time()
    last_orders = 0.0
    while True:
        time.sleep(WATCH_TICK_S)
        servo_commands(a)  # every tick: the dashboard is waiting for the latch to move
        if time.time() - last_orders < WATCH_ORDERS_S:
            continue
        last_orders = time.time()
        if frames is None and time.time() - cam_tried > CAMERA_RETRY_S:
            frames, cam_tried = start_camera(), time.time()
        heartbeat()
        for r in safe_db("GET", q) or []:
            oid = str(r["id"])
            if oid in tried:
                continue
            tried.add(oid)
            log("=== mission start", oid)
            if frames:
                stop_camera(frames)  # the mission needs the camera for obstacle detection
                frames, cam_tried = None, 0.0  # reopen right after the mission
            # one process per mission: a crash in one flight can't take the watcher down
            rc = subprocess.run([sys.executable, os.path.abspath(__file__), oid, "--connect", a.connect,
                                 "--baud", str(a.baud)] + (["--no-box"] if a.no_box else [])).returncode
            log("=== mission", oid, "ended, exit code", rc)
            break


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def heartbeat():
    """Tell the dashboard this drone is online (and where its camera is)."""
    if not DRONE_ID:
        return
    row = {"last_seen": now_iso()}
    if CAMERA_URL:
        row["camera_url"] = CAMERA_URL  # needs supabase/add_drone_camera_url.sql
    safe_db("PATCH", f"drones?id=eq.{DRONE_ID}", row)


def servo_commands(a):
    """Run "Test servo" commands from the dashboard. Only between missions: a mission owns the servo."""
    if not DRONE_ID:
        return
    rows = safe_db("GET", f"drone_commands?drone_id=eq.{DRONE_ID}&status=eq.pending"
                          f"&command_type=in.({','.join(SERVO_COMMANDS)})&select=id,command_type&order=created_at")
    for r in rows or []:
        log("dashboard servo command:", r["command_type"])
        try:
            box = Box(a.no_box)
            try:
                result, status = run_servo_command(box, r["command_type"]), "done"
            finally:
                box.close()  # free GPIO 17 for the next mission
        except Exception as e:  # report hardware errors to the dashboard instead of crashing the watcher
            result, status = str(e), "failed"
        log("  ->", status, result)
        safe_db("PATCH", f"drone_commands?id=eq.{r['id']}",
                {"status": status, "acked_at": now_iso(), "payload": {"result": result}})


def door_test():
    box = Box()
    for deg in (LOCKED_DEG, UNLOCKED_DEG, LOCKED_DEG):
        box.latch(deg)
        time.sleep(2)
    frames = start_camera()
    if frames:
        time.sleep(2)
        open("test.jpg", "wb").write(frames.frame)
        log("camera ok, wrote test.jpg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("order_id", nargs="?")
    ap.add_argument("--connect", default="/dev/ttyAMA0")  # Pi UART0, GPIO 14/15 via the JST plug
    ap.add_argument("--baud", type=int, default=57600)
    ap.add_argument("--no-box", action="store_true", help="fake the servo (SITL on a laptop)")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--door-test", action="store_true")
    ap.add_argument("--watch", action="store_true")
    ap.add_argument("--vision-test", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        assert abs(dist_m((0, 0), (0, 0.001)) - 111.19) < 0.1
        assert dist_m((23.588, 58.383), (23.588, 58.383)) == 0
        assert closeness_to_m(VISION_K) == 1.0 and closeness_to_m(0) == VISION_MAX_M
        assert closeness_to_m(VISION_K * 100) == VISION_MIN_M  # very near is floored at the FC minimum
        assert abs(object_m("person", 300, FOCAL_PX * 1.70 / 2.0) - 2.0) < 1e-9  # person 2 m away
        assert abs(object_m("keyboard", FOCAL_PX * 0.44 / 0.5, 50) - 0.5) < 1e-9  # keyboard: by width
        assert object_m("toaster", 100, 100) is None
        assert closeness_to_m(VISION_K / 100) == VISION_MAX_M  # far away is capped
        assert box_iou((0, 0, 10, 10), (0, 0, 10, 10)) == 1 and box_iou((0, 0, 1, 1), (5, 5, 6, 6)) == 0
        kept = nms([(0, 0.9, (0, 0, 10, 10)), (0, 0.8, (1, 1, 10, 10)), (1, 0.7, (1, 1, 10, 10))])
        assert [k[1] for k in kept] == [0.9, 0.7]  # duplicate person dropped, other class kept
        b = Box(no_box=True)
        b.latch(UNLOCKED_DEG)
        assert run_servo_command(b, "servo_open") == f"unlocked ({UNLOCKED_DEG} deg)"
        assert run_servo_command(b, "servo_test", wait=lambda _: None).endswith(f"locked ({LOCKED_DEG} deg)")
        b.close()
        return print("selftest ok")
    if a.door_test:
        return door_test()
    if a.vision_test:
        return vision_test()
    if not (SUPABASE_URL and SUPABASE_KEY):
        sys.exit("need SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars")
    if a.watch:
        return watch(a)
    if not a.order_id:
        sys.exit("need <orderId> or --watch")

    oid = a.order_id
    set_status = lambda st: (log("status ->", st), safe_db("PATCH", f"{ORDERS_TABLE}?id=eq.{oid}", {"status": st}))
    order = db("GET", f"{ORDERS_TABLE}?id=eq.{oid}&select=*")[0]
    dest = (float(order[DROPOFF_LAT]), float(order[DROPOFF_LNG]))
    log("order", oid, "dropoff", dest)

    m = mavutil.mavlink_connection(a.connect, baud=a.baud)
    if not m.wait_heartbeat(timeout=30):
        sys.exit("no heartbeat from flight controller (check UART wiring, SERIALx_PROTOCOL=2, baud)")
    log("FC connected, system", m.target_system)
    m.mav.request_data_stream_send(m.target_system, m.target_component,
                                   mavutil.mavlink.MAV_DATA_STREAM_ALL, 4, 1)

    def cmd(c, *p):
        m.mav.command_long_send(m.target_system, m.target_component, c, 0, *(list(p) + [0] * 7)[:7])

    def goto(lat, lon, alt):
        m.mav.set_position_target_global_int_send(
            0, m.target_system, m.target_component,
            mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT, 0b110111111000,
            int(lat * 1e7), int(lon * 1e7), alt, 0, 0, 0, 0, 0, 0, 0, 0)

    s = {}  # latest telemetry
    t_boot = time.time()

    def send_vision():
        """Camera distance -> ArduPilot as a forward rangefinder (RNGFND1_TYPE=10), repeated at 10 Hz."""
        if "vision_t" in s and time.time() - s["vision_t"] < 1:  # stale vision = send nothing, FC flags it
            m.mav.distance_sensor_send(int((time.time() - t_boot) * 1000), 20, int(VISION_MAX_M * 100),
                                       int(s["vision_m"] * 100), mavutil.mavlink.MAV_DISTANCE_SENSOR_UNKNOWN,
                                       0, 0, 255)

    def pump(seconds):
        end = time.time() + seconds
        while (left := end - time.time()) > 0:
            if OBSTACLE_SENSOR == "camera" and time.time() - s.get("vision_sent", 0) >= 0.1:
                send_vision()
                s["vision_sent"] = time.time()
            msg = m.recv_match(blocking=True, timeout=min(left, 0.1))
            if not msg or msg.get_srcSystem() != m.target_system:
                continue
            t = msg.get_type()
            if t == "GLOBAL_POSITION_INT":
                s.update(lat=msg.lat / 1e7, lon=msg.lon / 1e7, alt=msg.relative_alt / 1000,
                         heading=msg.hdg / 100 if msg.hdg != 65535 else None)
            elif t == "VFR_HUD":
                s["speed"] = msg.groundspeed
            elif t == "SYS_STATUS":
                s["battery"] = msg.battery_remaining  # -1 = FC battery monitor not set up
            elif t == "GPS_RAW_INT":
                s["fix"] = msg.fix_type
            elif t == "DISTANCE_SENSOR" and msg.orientation == 0:  # 0 = facing forward
                s["obstacle_m"], s["obstacle_t"] = msg.current_distance / 100, time.time()
            elif t == "HEARTBEAT" and msg.get_srcComponent() == 1:
                s["mode"] = m.flightmode
                s["armed"] = bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)

    box = Box(a.no_box)

    def push():
        """1 telemetry row per second (same columns the simulator wrote) + the drone's live spot every 2 s."""
        if "lat" not in s:
            return
        batt = s.get("battery") if s.get("battery", -1) >= 0 else None
        safe_db("POST", TELEMETRY_TABLE, {
            "order_id": oid, "drone_id": DRONE_ID or None, "lat": s["lat"], "lng": s["lon"], "alt": s["alt"],
            "speed_ms": s.get("speed"), "heading_deg": s.get("heading"), "battery_pct": batt,
            "flight_mode": s.get("mode")})
        if DRONE_ID and time.time() - s.get("drone_row_t", 0) >= 2:
            s["drone_row_t"] = time.time()
            safe_db("PATCH", f"drones?id=eq.{DRONE_ID}", {
                "current_lat": s["lat"], "current_lng": s["lon"], "current_alt": s["alt"], "battery_pct": batt,
                "last_seen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})

    def arm_and_takeoff():
        """Every takeoff goes through here: latch locked first."""
        box.latch(LOCKED_DEG, pump)
        m.set_mode("GUIDED")
        m.arducopter_arm()
        deadline = time.time() + 10
        while not s.get("armed") and time.time() < deadline:
            pump(0.5)
        if not s.get("armed"):
            log("arming failed: check pre-arm messages in Mission Planner")
            return False
        cmd(mavutil.mavlink.MAV_CMD_NAV_TAKEOFF, 0, 0, 0, 0, 0, 0, CRUISE_ALT_M)
        return True

    # --- pre-flight diagnostics ---
    box.latch(LOCKED_DEG)
    frames = start_camera()
    if OBSTACLE_SENSOR == "camera":
        if not frames:
            sys.exit("pre-flight: obstacle avoidance is set to camera but the camera is not working")
        start_vision(frames, s)
    pump(5)  # also gives the depth model time for its first frames
    try:  # Pi rides in the box on a 5 V BEC: brown-outs and heat are the real killers
        thr = int(subprocess.run(["vcgencmd", "get_throttled"], capture_output=True, text=True).stdout.split("=")[1], 16)
        if thr & 0x5:  # bit0 under-voltage now, bit2 throttled now
            sys.exit(f"pre-flight: Pi under-voltage/throttled (0x{thr:x}), fix the 5 V BEC first")
    except (OSError, IndexError, ValueError):
        log("WARNING: could not read Pi power state (vcgencmd)")
    if OBSTACLE_SENSOR == "camera" and time.time() - s.get("vision_t", 0) > 2:
        sys.exit("pre-flight: camera obstacle detection is not producing data, avoidance would be blind")
    if OBSTACLE_SENSOR == "lidar" and time.time() - s.get("obstacle_t", 0) > 2:
        sys.exit("pre-flight: no data from the forward LiDAR, obstacle avoidance would be blind")
    if s.get("fix", 0) < 3:
        sys.exit(f"pre-flight: no 3D GPS fix (fix_type={s.get('fix')})")
    if 0 <= s.get("battery", -1) < MIN_BATTERY_PCT + 20:
        sys.exit(f"pre-flight: battery {s['battery']}% too low to start")
    if s.get("battery", -1) < 0:
        log("WARNING: FC reports no battery %, low-battery abort is OFF. Set BATT_MONITOR on the FC.")
    if not arm_and_takeoff():
        sys.exit("pre-flight failed, order left as dispatched")
    set_status(IN_FLIGHT)

    phase, t0, last_push, last_poll = "takeoff", time.time(), 0, 0
    try:
        while True:
            pump(0.2)
            now = time.time()
            if now - last_push >= 1:
                push()
                last_push = now
            here = (s.get("lat", 0), s.get("lon", 0))
            ahead = s.get("vision_m" if OBSTACLE_SENSOR == "camera" else "obstacle_m", 99)
            if s.get("armed") and ahead < OBSTACLE_WARN_M and now - s.get("obstacle_log", 0) > 3:
                what = ", ".join(d[0] for d in s.get("dets", [])) or "unknown object"
                log(f"obstacle {ahead:.1f} m ahead ({what}), ArduPilot avoiding")
                s["obstacle_log"] = now
            low_batt = 0 <= s.get("battery", -1) < MIN_BATTERY_PCT

            if phase in ("takeoff", "outbound") and low_batt:
                log(f"battery {s['battery']}%, RTL with the pouch")
                m.set_mode("RTL")
                phase = "rtl"
            elif phase == "takeoff" and s.get("alt", 0) >= CRUISE_ALT_M * 0.95:
                log("cruise alt reached, heading to dropoff")
                goto(*dest, CRUISE_ALT_M)
                phase = "outbound"
            elif phase == "outbound" and dist_m(here, dest) < ARRIVE_RADIUS_M:
                log("over dropoff, landing")
                m.set_mode("LAND")
                phase = "landing"
            elif phase == "landing" and not s.get("armed"):  # ArduPilot disarms itself after touchdown
                set_status(ARRIVED)
                phase, t0 = "wait_otp", now
            elif phase == "wait_otp":
                if now - last_poll >= 2:
                    last_poll = now
                    rows = safe_db("GET", f"{ORDERS_TABLE}?id=eq.{oid}&select=status,otp_verified_at")
                    if rows and (rows[0]["status"] == DELIVERED or rows[0]["otp_verified_at"]):  # either = OTP ok
                        if frames and frames.frame:
                            upload_photo(f"{oid}.jpg", frames.frame)  # who was at the door
                        box.latch(UNLOCKED_DEG, pump)
                        phase, t0 = "unlocked", now
                if phase == "wait_otp" and now - t0 > OTP_TIMEOUT_S:
                    log("OTP timeout, door stays locked")
                    phase, t0 = "depart", now
            elif phase == "unlocked" and now - t0 > DOOR_OPEN_S:
                # ponytail: no reed, so a flap held open past DOOR_OPEN_S is not detected; add a reed if that bites
                log("door time up, re-locking")
                box.latch(LOCKED_DEG, pump)
                phase, t0 = "depart", now
            elif phase == "depart" and now - t0 > STAND_CLEAR_S:
                if arm_and_takeoff():
                    phase = "climb_home"
                else:
                    t0 = now  # door ajar or pre-arm fail: retry after STAND_CLEAR_S, never fly open
            elif phase == "climb_home" and s.get("alt", 0) >= CRUISE_ALT_M * 0.9:
                m.set_mode("RTL")
                phase = "rtl"
            elif phase == "rtl" and not s.get("armed"):
                set_status(RETURNED)
                log("landed home + disarmed, mission complete")
                break
    except KeyboardInterrupt:
        if s.get("armed"):
            m.set_mode("RTL")
        log("operator Ctrl+C in phase", phase)
        # ponytail: bridge exits here; FC finishes RTL on its own, mark the order by hand


if __name__ == "__main__":
    main()
