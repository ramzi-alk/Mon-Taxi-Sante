import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { isAllowedAdminEmail } from "~/lib/adminAccess";
import { withServerFnLogging } from "~/lib/logger";

/**
 * Authoritative admin-access check, independent of whatever the client
 * fetched from `profiles` under RLS. Re-verifies the access token server
 * side (auth.getUser) and re-reads role/grants with the service-role
 * client, then layers the ADMIN_EMAILS allowlist on top — both must pass.
 *
 * Admin access comes from either `profiles.role = 'admin'` (legacy/primary
 * accounts) or a row in `admin_grants` (migration 044) — the latter lets an
 * account stay 'driver'/'patient' as its primary role while also holding
 * admin access, since profiles.role is a single value and can't represent
 * both at once.
 */
async function checkAdminAccess(input: { accessToken: string }): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(input.accessToken);
  if (userError || !userData.user) return false;

  const [{ data: profile }, { data: grant }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle(),
    admin.from("admin_grants").select("profile_id").eq("profile_id", userData.user.id).maybeSingle(),
  ]);

  if (profile?.role !== "admin" && !grant) return false;
  return isAllowedAdminEmail(userData.user.email);
}

export const checkAdminAccessServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => input)
  .handler(async ({ data }) =>
    withServerFnLogging("checkAdminAccess", {}, () => checkAdminAccess(data))
  );
