"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Terminal, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TERMINAL_STATUSES = ["delivered", "returned", "cancelled", "failed"];

export function SimulatorCommandCard({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: string;
}) {
  const [copied, setCopied] = useState(false);

  if (TERMINAL_STATUSES.includes(orderStatus)) return null;

  const command = `npm run simulator -- ${orderId}`;

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      toast.success("Command copied — paste in your terminal");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-amber-700" />
          <p className="text-sm font-semibold text-amber-900">
            Run Simulator (Demo)
          </p>
        </div>
        <p className="text-xs text-amber-800">
          Paste this command in your terminal to start the mock drone flight
          for this order:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-slate-900 px-3 py-2.5 font-mono text-xs text-slate-100">
            {command}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="mr-1.5 size-3.5 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1.5 size-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-amber-700">
          The simulator runs on your laptop and pushes telemetry to the cloud.
          The dashboard and patient page will show live updates.
        </p>
      </CardContent>
    </Card>
  );
}
