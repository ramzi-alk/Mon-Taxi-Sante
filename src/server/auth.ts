import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { verifyTurnstile } from "./turnstile";
import { withServerFnLogging } from "~/lib/logger";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface LoginInput {
  email: string;
  password: string;
  turnstileToken: string;
}

interface LoginResult {
  access_token: string;
  refresh_token: string;
}

async function checkLockout(email: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("login_attempts")
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
    .from("login_attempts")
    .select("failed_count")
    .eq("email", normalized)
    .maybeSingle();

  const nextCount = (existing?.failed_count ?? 0) + 1;
  await admin.from("login_attempts").upsert({
    email: normalized,
    failed_count: nextCount,
    locked_until: nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function clearAttempts(email: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("login_attempts").delete().eq("email", email.toLowerCase());
}

/**
 * Connexion chauffeur/patient : Turnstile-gated et throttlée par email
 * (login_attempts, migration 071) — même mécanisme que adminLogin
 * (src/server/adminAuth.ts) pour /admin/connexion, jusqu'ici la seule des
 * deux pages de connexion à en bénéficier. Retourne les tokens de session
 * bruts pour que le client les hydrate via supabase.auth.setSession() : la
 * connexion elle-même a lieu ici (côté serveur), donc le verrouillage et
 * Turnstile sont incontournables — appeler directement l'API Supabase Auth
 * depuis le navigateur ne permettrait plus de les court-circuiter.
 */
async function login(input: LoginInput): Promise<LoginResult> {
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

  await clearAttempts(input.email);

  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

export const loginServerFn = createServerFn({ method: "POST" })
  .validator((input: LoginInput) => input)
  .handler(async ({ data }) => withServerFnLogging("login", { email: data.email }, () => login(data)));
