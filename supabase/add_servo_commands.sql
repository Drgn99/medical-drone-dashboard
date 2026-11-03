-- Lets the website's "Test servo" button and the Pi's replies through the drone_commands check constraints.
-- Keeps every existing value. Ran on the live project on 2026-11-03.
begin;

alter table public.drone_commands drop constraint drone_commands_command_type_check;
alter table public.drone_commands add constraint drone_commands_command_type_check
  check (command_type = any (array['takeoff','goto','land','rtl','unlock_payload','abort',
                                   'servo_open','servo_close','servo_test']));

alter table public.drone_commands drop constraint drone_commands_status_check;
alter table public.drone_commands add constraint drone_commands_status_check
  check (status = any (array['pending','sent','ack','failed','done']));

commit;
