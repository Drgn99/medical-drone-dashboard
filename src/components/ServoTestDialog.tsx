"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Cog, Loader2, XCircle } from "lucide-react";
import {
  getDroneCommandStatus,
  sendServoCommand,
  type ServoCommandType,
} from "@/lib/actions/drones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Phase =
  | { kind: "idle" }
  | { kind: "waiting"; label: string }
  | { kind: "done"; label: string; result: string | null }
  | { kind: "failed"; message: string };

const POLL_MS = 500;
const TIMEOUT_MS = 15000;

const LABELS: Record<ServoCommandType, string> = {
  servo_open: "Open",
  servo_close: "Close",
  servo_test: "Open, then close",
};

export function ServoTestDialog({
  droneId,
  droneName,
}: {
  droneId: string;
  droneName: string;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every new command / close, so late replies from an older run are ignored.
  const runRef = useRef(0);

  function stopPolling() {
    runRef.current++;
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  }

  useEffect(() => stopPolling, []);

  async function run(type: ServoCommandType) {
    stopPolling();
    const runId = runRef.current;
    const label = LABELS[type];
    setPhase({ kind: "waiting", label });

    const sent = await sendServoCommand(droneId, type);
    if (runId !== runRef.current) return;
    if (!sent.success || !sent.commandId) {
      setPhase({ kind: "failed", message: sent.error ?? "Could not send the command." });
      return;
    }

    const commandId = sent.commandId;
    const startedAt = Date.now();

    // Poll one request at a time: server actions are queued, so a fixed
    // interval would pile up requests and delay the next button press.
    const poll = async () => {
      const { status, result } = await getDroneCommandStatus(commandId);
      if (runId !== runRef.current) return;

      if (status === "done") {
        setPhase({ kind: "done", label, result });
      } else if (status === "failed") {
        setPhase({ kind: "failed", message: result ?? "The Pi reported an error." });
      } else if (Date.now() - startedAt > TIMEOUT_MS) {
        setPhase({
          kind: "failed",
          message:
            "No reply from the Pi after 15 seconds. Check that the drone-bridge service is running, no mission is in progress, and DRONE_ID matches this drone.",
        });
      } else {
        pollRef.current = setTimeout(poll, POLL_MS);
      }
    };
    pollRef.current = setTimeout(poll, POLL_MS);
  }

  const busy = phase.kind === "waiting";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setPhase({ kind: "idle" });
          setOpen(true);
        }}
      >
        <Cog className="mr-1.5 size-3.5" />
        Test servo
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) stopPolling();
          setOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test servo on {droneName}</DialogTitle>
            <DialogDescription>
              Sends a command to the Raspberry Pi. Watch the payload latch while
              it runs.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => run("servo_open")}>
              Open
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("servo_close")}>
              Close
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("servo_test")}>
              Open, then close
            </Button>
          </div>

          <div className="min-h-10 text-sm" aria-live="polite">
            {phase.kind === "waiting" && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {phase.label}: waiting for the Pi to confirm…
              </p>
            )}
            {phase.kind === "done" && (
              <p className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span>
                  {phase.label}: the Pi ran the command
                  {phase.result ? ` (${phase.result})` : ""}.
                </span>
              </p>
            )}
            {phase.kind === "failed" && (
              <p className="flex items-start gap-2 text-red-700">
                <XCircle className="mt-0.5 size-4 shrink-0" />
                <span>{phase.message}</span>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
