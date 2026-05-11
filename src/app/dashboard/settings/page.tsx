import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Settings, Building2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HospitalStaff } from "@/types/database";

export default async function SettingsPage() {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: staffList } = await supabase
    .from("hospital_staff")
    .select("id, user_id, name, role, created_at")
    .eq("hospital_id", ctx.hospital.id)
    .order("created_at");

  const h = ctx.hospital;

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      {/* Hospital section */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Building2 className="size-4" /> Hospital
        </h2>
        <Card>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
            <ReadOnlyField label="Name" value={h.name} />
            <ReadOnlyField label="Address" value={h.address ?? "—"} />
            <ReadOnlyField
              label="Latitude"
              value={h.lat != null ? h.lat.toFixed(6) : "—"}
            />
            <ReadOnlyField
              label="Longitude"
              value={h.lng != null ? h.lng.toFixed(6) : "—"}
            />
          </CardContent>
        </Card>
      </section>

      {/* Team section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" /> Team
          </h2>
          <button
            disabled
            className={buttonVariants({
              variant: "outline",
              className: "cursor-not-allowed opacity-50",
            })}
          >
            Invite Staff
          </button>
        </div>

        {staffList && staffList.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(staffList as HospitalStaff[]).map((member, i) => (
                    <TableRow
                      key={member.id}
                      className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                    >
                      <TableCell className="font-medium">
                        {member.name ?? "—"}
                        {member.user_id === ctx.user.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{member.role}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {member.user_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(member.created_at), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                Staff email addresses require a{" "}
                <code className="rounded bg-muted px-1">SECURITY DEFINER</code>{" "}
                SQL function to expose{" "}
                <code className="rounded bg-muted px-1">auth.users</code> safely.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No team members found.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
