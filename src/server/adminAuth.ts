import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { verifyTurnstile } from "./turnstile";
import { checkAdminAccessServerFn } from "./adminAccess";
import { withServerFnLogging } from "~/lib/logger";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface AdminLoginInput {
  email: string;
  password: string;
  turnstileToken: string;
}

interface AdminLoginResult {
  access_token: string;
  refresh_token: string;
}

async function checkLockout(email: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("admin_login_attempts")
    .select("locked_until")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (data?.locked_until && new Date(data.locked_until) > new Date()) {
    throw new Error("too_many_attempts");
  }
}

async function recordFailure(email: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const normalized = email.toLowerCase();
  const { data: existing } = await admin
    .from("admin_login_attempts")
    .select("failed_count")
    .eq("email", normalized)
    .maybeSingle();

  const nextCount = (existing?.failed_count ?? 0) + 1;
  await admin.from("admin_login_attempts").upsert({
    email: normalized,
    failed_count: nextCount,
    locked_until: nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function clearAttempts(email: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("admin_login_attempts").delete().eq("email", email.toLowerCase());
}

/**
 * Dedicated admin login: Turnstile-gated and throttled per email
 * (admin_login_attempts, migration 045) — stricter than /connexion, which
 * has neither. Returns raw session tokens for the client to hydrate via
 * supabase.auth.setSession(), since the actual signInWithPassword call
 * happens here (server side) rather than in the browser, so the lockout
 * and Turnstile checks are authoritative and can't be bypassed by calling
 * the Supabase Auth API directly.
 */
async function adminLogin(input: AdminLoginInput): Promise<AdminLoginResult> {
  const isHuman = await verifyTurnstile(input.turnstileToken);
  if (!isHuman) {
    throw new Error("captcha_invalid");
  }

  await checkLockout(input.email);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const anonClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await anonClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.session) {
    await recordFailure(input.email);
    throw new Error("invalid_credentials");
  }

  // Same authoritative check used by the /admin route guard — a valid
  // password alone isn't enough here, the account also needs admin
  // access (role or grant) and to pass the ADMIN_EMAILS allowlist.
  const hasAdminAccess = await checkAdminAccessServerFn({
    data: { accessToken: data.session.access_token },
  });
  if (!hasAdminAccess) {
    await recordFailure(input.email);
    throw new Error("not_admin");
  }

  await clearAttempts(input.email);

  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

export const adminLoginServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: AdminLoginInput) => input)
  .handler(async ({ data }) =>
    withServerFnLogging("adminLogin", { email: data.email }, () => adminLogin(data))
  );
