import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Medical Drone Dashboard
      </h1>
      {user ? (
        <>
          <p className="mt-4 text-lg text-muted-foreground">
            Welcome back, {user.email}
          </p>
          <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>
            Go to Dashboard
          </Link>
        </>
      ) : (
        <>
          <p className="mt-4 text-lg text-muted-foreground">
            Real-time monitoring and control for autonomous medical delivery
            drones.
          </p>
          <Link href="/login" className={buttonVariants({ className: "mt-6" })}>
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
