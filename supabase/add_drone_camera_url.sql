-- Public HLS URL of the drone's live camera, reported by pi/servo_listener.py.
alter table public.drones add column if not exists camera_url text;
