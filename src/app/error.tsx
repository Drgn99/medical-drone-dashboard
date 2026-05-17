"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <AlertCircle className="mb-4 size-12 text-red-500" />
      <h1 className="text-2xl font-bold text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        An unexpected error occurred. Please try again, or contact support if
        the problem persists.
      </p>

      <details className="mt-4 w-full max-w-md">
        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
          Error details
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-left font-mono text-xs text-slate-700">
          {error.message}
        </pre>
      </details>

      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
