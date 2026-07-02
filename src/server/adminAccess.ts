import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { isAllowedAdminEmail } from "~/lib/adminAccess";
import { withServerFnLogging } from "~/lib/logger";

/**
 * Authoritative admin-access check, independent of whatever the client
 * fetched from `profiles` under RLS. Re-verifies the access token server
 * side (auth.getUser) and re-reads the role with the service-role client,
 * then layers the ADMIN_EMAILS allowlist on top — both must pass.
 */
async function checkAdminAccess(input: { accessToken: string }): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(input.accessToken);
  if (userError || !userData.user) return false;

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return false;
  return isAllowedAdminEmail(userData.user.email);
}

export const checkAdminAccessServerFn = createServerFn({ method: "POST" })
  .validator((input: { accessToken: string }) => input)
  .handler(async ({ data }) =>
    withServerFnLogging("checkAdminAccess", {}, () => checkAdminAccess(data))
  );
