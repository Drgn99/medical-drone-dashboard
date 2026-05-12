"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyOtp } from "@/lib/actions/track";

export function OtpVerifier({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(orderId, code.trim());
      if (result.ok) {
        setVerified(true);
      } else {
        setError(result.error ?? "Verification failed");
      }
    });
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <CheckCircle className="size-10 text-green-500" />
        <p className="text-lg font-semibold text-green-800">Delivery confirmed!</p>
        <p className="text-sm text-green-700">
          Thank you for confirming receipt of your medical delivery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold">Confirm delivery</p>
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code from your notification email to verify receipt.
      </p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, ""));
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleVerify();
        }}
        placeholder="000000"
        className="w-full rounded-lg border border-input bg-transparent px-4 py-3 text-center font-mono text-2xl tracking-widest outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40"
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={isPending || code.length !== 6}
        onClick={handleVerify}
      >
        {isPending ? "Verifying…" : "Verify"}
      </Button>
    </div>
  );
}
