import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: staff } = await supabase
    .from("hospital_staff")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!staff) {
    redirect("/onboarding");
  }

  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
