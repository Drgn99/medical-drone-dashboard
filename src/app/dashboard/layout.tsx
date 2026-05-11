import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { signOut } from "@/lib/actions/auth";
import { SidebarNavLinks } from "@/components/SidebarNavLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getHospitalContext();
  if (!ctx) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarNavLinks
        hospitalName={ctx.hospital.name}
        userEmail={ctx.user.email}
        signOutAction={signOut}
      />
      <main className="flex-1 bg-slate-50">{children}</main>
    </div>
  );
}
