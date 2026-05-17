import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Settings, Building2, Users, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHospitalContext } from "@/lib/hospital";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PendingRequestActions } from "@/components/PendingRequestActions";
import { InviteStaffDialog } from "@/components/InviteStaffDialog";
import type { HospitalStaff } from "@/types/database";

export default async function SettingsPage() {
  const ctx = await getHospitalContext();
  if (!ctx) redirect("/login");

  const isAdmin = ctx.staff.role === "admin";

  const supabase = await createClient();

  // Fetch all staff rows — admins see everything, staff see only active
  const staffQuery = supabase
    .from("hospital_staff")
    .select("*")
    .eq("hospital_id", ctx.hospital.id)
    .order("created_at");

  const { data: allStaff, error: staffError } = await staffQuery;

  if (staffError) {
    console.error("hospital_staff list failed:", staffError);
  }

  const staffList = (allStaff ?? []) as HospitalStaff[];
  const activeStaff = staffList.filter((s) => s.status === "active");
  const pendingRequests = staffList.filter((s) => s.status === "pending");
  const rejectedRequests = staffList.filter((s) => s.status === "rejected");

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
              value={h.latitude != null ? h.latitude.toFixed(6) : "—"}
            />
            <ReadOnlyField
              label="Longitude"
              value={h.longitude != null ? h.longitude.toFixed(6) : "—"}
            />
          </CardContent>
        </Card>
      </section>

      {/* Pending Requests — admin only, only when there are pending items */}
      {isAdmin && pendingRequests.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-600">
            <Clock className="size-4" /> Pending Access Requests
          </h2>
          <Card className="border-amber-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {req.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.requested_at
                          ? formatDistanceToNow(new Date(req.requested_at), {
                              addSuffix: true,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <PendingRequestActions
                          staffId={req.id}
                          staffName={req.full_name ?? "this user"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Team section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-4" /> Team
          </h2>
          {isAdmin && <InviteStaffDialog />}
        </div>

        {activeStaff.length > 0 ? (
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
                  {activeStaff.map((member, i) => (
                    <TableRow
                      key={member.id}
                      className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                    >
                      <TableCell className="font-medium">
                        {member.full_name ?? "—"}
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

      {/* Rejected — admin only, collapsible info */}
      {isAdmin && rejectedRequests.length > 0 && (
        <section className="space-y-4">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Rejected Requests ({rejectedRequests.length})
            </summary>
            <Card className="mt-3">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Decided</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {req.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {req.requested_at
                            ? format(new Date(req.requested_at), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {req.decided_at
                            ? format(new Date(req.decided_at), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </details>
        </section>
      )}
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
