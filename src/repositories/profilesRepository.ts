import type { SupabaseClient } from "~/lib/supabase";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";

type ProfileRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

export interface MyProfile {
  full_name: string;
  email: string | null;
  phone: string | null;
}

export async function getProfileRole(
  client: SupabaseClient,
  userId: string
): Promise<ProfileRole | null> {
  const { data } = await client.from("profiles").select("role").eq("id", userId).single();
  return data?.role ?? null;
}

/**
 * True if this account has admin panel access, whether via
 * `profiles.role = 'admin'` or an `admin_grants` row (migration 044) —
 * the latter lets a 'driver'/'patient' account also be an admin without
 * changing its primary role. This is a lightweight UX check (drives the
 * post-login redirect); the authoritative gate is still
 * checkAdminAccessServerFn (src/server/adminAccess.ts), which also
 * enforces the ADMIN_EMAILS allowlist server-side.
 */
export async function hasAdminAccess(client: SupabaseClient, userId: string): Promise<boolean> {
  const [{ data: profile }, { data: grant }] = await Promise.all([
    client.from("profiles").select("role").eq("id", userId).maybeSingle(),
    client.from("admin_grants").select("profile_id").eq("profile_id", userId).maybeSingle(),
  ]);
  return profile?.role === "admin" || !!grant;
}

export async function fetchMyProfile(
  client: SupabaseClient,
  profileId: string
): Promise<MyProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    logger.error("profiles.fetchMyProfile failed", { error: error.message, profileId });
    throw new Error(error.message);
  }
  return data;
}

/**
 * Direct UPDATE on the caller's own row — RLS ("profiles: own update") scopes
 * it to auth.uid() = id and forbids touching role (no escalation).
 */
export async function updateMyProfile(
  client: SupabaseClient,
  profileId: string,
  fields: { full_name: string; phone: string | null }
): Promise<void> {
  const { error } = await client.from("profiles").update(fields).eq("id", profileId);

  if (error) {
    logger.error("profiles.updateMyProfile failed", { error: error.message, profileId });
    throw new Error(error.message);
  }
}

/**
 * The handle_new_user DB trigger normally backs every auth.users row with a
 * matching profiles row, but GoTrue-driven inserts (signUp, signInAnonymously)
 * have occasionally landed without one — no logged trigger failure, root
 * cause unconfirmed (see migration 017). Self-heal here instead of trusting
 * the trigger as the only path: read the source of truth (auth.users) and
 * upsert the profile before continuing. Must be called with the service-role
 * admin client (needs auth.admin.getUserById + bypasses RLS for the upsert).
 */
export async function ensureProfile(
  admin: SupabaseClient,
  profileId: string
): Promise<{ id: string; role: ProfileRole } | null> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();

  if (existing) return existing;

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profileId);
  if (authUserError || !authUser.user) {
    logger.error("profiles.ensureProfile auth user not found", {
      profileId,
      error: authUserError?.message,
    });
    return null;
  }

  const metadata = authUser.user.user_metadata ?? {};
  const role: ProfileRole =
    metadata.role === "driver" || metadata.role === "admin" ? metadata.role : "patient";
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.length >= 2
      ? metadata.full_name
      : authUser.user.email?.split("@")[0] ?? "Patient";

  const { data: created, error: insertError } = await admin
    .from("profiles")
    .upsert({ id: profileId, email: authUser.user.email ?? null, full_name: fullName, role })
    .select("id, role")
    .single();

  if (insertError) {
    logger.error("profiles.ensureProfile upsert failed", { profileId, error: insertError.message });
    return null;
  }

  return created;
}
