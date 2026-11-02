"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getHospitalContext } from "@/lib/hospital";
import { sendInviteEmail } from "@/lib/email/send";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Self-registration: user requests access to the hospital.
 * Prototype assumes a single hospital — assigns to the first one found.
 */
export async function requestHospitalAccess(input: {
  full_name: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Check if a row already exists for this user (any status)
  const { data: existing } = await supabase
    .from("hospital_staff")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "You already have an access request" };
  }

  // Single-hospital prototype: pick the first hospital
  const { data: hospital, error: hospError } = await supabase
    .from("hospitals")
    .select("id")
    .limit(1)
    .single();

  if (hospError || !hospital) {
    return { success: false, error: "No hospital configured in the system" };
  }

  const { error } = await supabase.from("hospital_staff").insert({
    user_id: user.id,
    hospital_id: hospital.id,
    full_name: input.full_name.trim(),
    role: "staff",
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/onboarding");
  return { success: true };
}

/**
 * Admin approves a pending staff request.
 */
export async function approveStaffRequest(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };
  if (ctx.staff.role !== "admin") return { success: false, error: "Admin only" };

  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("hospital_staff")
    .select("id, status")
    .eq("id", staffId)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (fetchErr || !row) return { success: false, error: "Request not found" };
  if (row.status !== "pending") {
    return { success: false, error: "Request is not pending" };
  }

  const { error } = await supabase
    .from("hospital_staff")
    .update({
      status: "active",
      decided_at: new Date().toISOString(),
      decided_by: ctx.user.id,
    })
    .eq("id", staffId)
    .eq("hospital_id", ctx.hospital.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Admin declines a pending staff request.
 */
export async function declineStaffRequest(
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };
  if (ctx.staff.role !== "admin") return { success: false, error: "Admin only" };

  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("hospital_staff")
    .select("id, status")
    .eq("id", staffId)
    .eq("hospital_id", ctx.hospital.id)
    .single();

  if (fetchErr || !row) return { success: false, error: "Request not found" };
  if (row.status !== "pending") {
    return { success: false, error: "Request is not pending" };
  }

  const { error } = await supabase
    .from("hospital_staff")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: ctx.user.id,
    })
    .eq("id", staffId)
    .eq("hospital_id", ctx.hospital.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Admin invites a user directly by email. Creates auth user via
 * Supabase admin API and inserts hospital_staff with status='active'.
 */
export async function inviteStaffDirectly(input: {
  email: string;
  full_name: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getHospitalContext();
  if (!ctx) return { success: false, error: "Not authenticated" };
  if (ctx.staff.role !== "admin") return { success: false, error: "Admin only" };

  const service = createServiceClient();

  // Check if email is already on staff
  const { data: existingUser } = await service.auth.admin.listUsers();
  const matchingUser = existingUser?.users.find(
    (u) => u.email === input.email.trim().toLowerCase()
  );

  if (matchingUser) {
    // Check if already on staff at this hospital
    const { data: existingStaff } = await service
      .from("hospital_staff")
      .select("id")
      .eq("user_id", matchingUser.id)
      .eq("hospital_id", ctx.hospital.id)
      .maybeSingle();

    if (existingStaff) {
      return { success: false, error: "This user is already on the team" };
    }
  }

  // Generate the sign-in link ourselves and send it via Gmail, instead of
  // inviteUserByEmail, which depends on Supabase's own SMTP settings.
  // An existing auth user (e.g. from an earlier failed invite) gets a magic link.
  const email = input.email.trim().toLowerCase();
  const { data: link, error: linkError } =
    await service.auth.admin.generateLink({
      type: matchingUser ? "magiclink" : "invite",
      email,
    });

  if (linkError) return { success: false, error: linkError.message };

  const inviteUrl =
    `${APP_URL}/auth/confirm` +
    `?token_hash=${encodeURIComponent(link.properties.hashed_token)}` +
    `&type=${link.properties.verification_type === "invite" ? "invite" : "email"}`;

  const sent = await sendInviteEmail({
    to: email,
    fullName: input.full_name.trim(),
    hospitalName: ctx.hospital.name,
    invitedBy: ctx.staff.full_name ?? "An administrator",
    inviteUrl,
  });

  if (!sent.ok) {
    // Don't leave a half-created user behind, so the invite can be retried.
    if (!matchingUser) await service.auth.admin.deleteUser(link.user.id);
    return { success: false, error: `Could not send invite email: ${sent.error}` };
  }

  // Insert hospital_staff with status='active' (admin-initiated, skip approval)
  const { error: insertError } = await service.from("hospital_staff").insert({
    user_id: link.user.id,
    hospital_id: ctx.hospital.id,
    full_name: input.full_name.trim(),
    role: input.role,
    status: "active",
    requested_at: new Date().toISOString(),
    decided_at: new Date().toISOString(),
    decided_by: ctx.user.id,
  });

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
