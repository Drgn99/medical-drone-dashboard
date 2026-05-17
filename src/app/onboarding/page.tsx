import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestAccessForm } from "./RequestAccessForm";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if user has a hospital_staff row (any status)
  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("id, status, requested_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // STATE 4 — Active: redirect to dashboard
  if (staff?.status === "active") {
    redirect("/dashboard");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  // STATE 2 — Pending
  if (staff?.status === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Access Request Pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your access request is pending approval. An administrator will
              review it shortly. You&apos;ll be able to access the dashboard
              once approved.
            </p>
            {staff.requested_at && (
              <p className="text-xs text-muted-foreground">
                Requested on{" "}
                {format(new Date(staff.requested_at), "MMMM d, yyyy")}
              </p>
            )}
            <form action={signOut}>
              <Button variant="outline" type="submit" className="w-full">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STATE 3 — Rejected
  if (staff?.status === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your access request was not approved. Please contact your hospital
              administrator if you believe this is an error.
            </p>
            <form action={signOut}>
              <Button variant="outline" type="submit" className="w-full">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STATE 1 — No row: show request form
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Request Dashboard Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Enter your full name to request access to the hospital dashboard.
            An administrator will review your request.
          </p>
          <RequestAccessForm />
          <form action={signOut}>
            <Button variant="ghost" type="submit" className="w-full text-xs">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
