import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_DEPARTMENTS = [
  "Emergency",
  "General Medicine",
  "Pediatrics",
  "Surgery",
  "Cardiology",
  "Radiology",
  "Pharmacy",
  "Laboratory",
];

function randomCode(len: number) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const createHospitalWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      hospitalName: string;
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      hospitalType?: string;
      adminFullName: string;
      departments?: string[];
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // Check if this user already belongs to a hospital
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("hospital_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.hospital_id) {
      throw new Error("You already belong to a hospital workspace.");
    }

    const workspaceId = `KRS-${randomCode(6)}`;
    const accessKey = randomCode(16);

    const { data: hospital, error: hErr } = await supabaseAdmin
      .from("hospitals")
      .insert({
        name: data.hospitalName,
        workspace_id: workspaceId,
        access_key: accessKey,
        email: data.email,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        country: data.country ?? null,
        hospital_type: data.hospitalType ?? null,
      })
      .select()
      .single();
    if (hErr || !hospital) throw new Error(hErr?.message || "Failed to create hospital");

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      hospital_id: hospital.id,
      full_name: data.adminFullName,
      email: data.email,
    });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      hospital_id: hospital.id,
      role: "admin",
    });
    if (rErr) throw new Error(rErr.message);

    const deps = (data.departments && data.departments.length ? data.departments : DEFAULT_DEPARTMENTS).map((name) => ({
      hospital_id: hospital.id,
      name,
    }));
    await supabaseAdmin.from("departments").insert(deps);

    return {
      workspaceId: hospital.workspace_id,
      accessKey: hospital.access_key,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
    };
  });

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      email: string;
      password: string;
      fullName: string;
      role: "doctor" | "nurse" | "reception" | "admin";
      departmentId?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can create staff.");

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("user_id", userId)
      .single();
    if (!myProfile?.hospital_id) throw new Error("No hospital context.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (cErr || !created?.user) throw new Error(cErr?.message || "Failed to create user");

    const newUserId = created.user.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      user_id: newUserId,
      hospital_id: myProfile.hospital_id,
      full_name: data.fullName,
      email: data.email,
      department_id: data.departmentId ?? null,
    });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      hospital_id: myProfile.hospital_id,
      role: data.role,
    });
    if (rErr) throw new Error(rErr.message);

    return { userId: newUserId, email: data.email };
  });

// ============================================================
// Enterprise staff invitations (email + secure link + expiry)
// ============================================================

export const createStaffInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      email: string;
      fullName?: string;
      role: "doctor" | "nurse" | "reception" | "admin";
      departmentId?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can invite staff.");

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("user_id", userId)
      .single();
    if (!myProfile?.hospital_id) throw new Error("No hospital context.");

    const email = data.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Please provide a valid email address.");
    }

    const { data: inv, error } = await supabase
      .from("staff_invitations")
      .insert({
        hospital_id: myProfile.hospital_id,
        email,
        full_name: data.fullName ?? null,
        role: data.role,
        department_id: data.departmentId ?? null,
        invited_by: userId,
      })
      .select("id, token, email, role, expires_at")
      .single();
    if (error || !inv) throw new Error(error?.message ?? "Failed to create invitation");

    return {
      id: inv.id,
      token: inv.token,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expires_at,
    };
  });

export const revokeStaffInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invitationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can revoke invitations.");
    const { error } = await supabase
      .from("staff_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.invitationId)
      .is("accepted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resendStaffInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invitationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("resend_staff_invitation", {
      _invitation_id: data.invitationId,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error("Failed to resend invitation");
    return {
      id: row.id as string,
      token: row.token as string,
      email: row.email as string,
      role: row.role as string,
      expiresAt: row.expires_at as string,
    };
  });

export const acceptStaffInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string; fullName?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("accept_invitation", {
      _token: data.token,
      _full_name: data.fullName ?? "",
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    return { hospitalId: row?.hospital_id, hospitalName: row?.hospital_name };
  });
