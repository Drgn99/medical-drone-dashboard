"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={handleCopy}
        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{copied ? "Copied!" : "Copy"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
