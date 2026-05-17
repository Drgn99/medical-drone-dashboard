import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Compass className="mb-4 size-12 text-slate-400" />
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "default", className: "mt-6" })}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
