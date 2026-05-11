import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, {user.email}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Phase 1 complete. Dashboard UI coming in Phase 2.
      </p>
      <form action={signOut} className="mt-6">
        <Button variant="outline" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
