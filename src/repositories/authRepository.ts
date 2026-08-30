import type { SupabaseClient } from "~/lib/supabase";

export async function getCurrentUser(client: SupabaseClient) {
  const { data } = await client.auth.getUser();
  return data.user;
}

export async function getCurrentSession(client: SupabaseClient) {
  const { data } = await client.auth.getSession();
  return data.session;
}

export function signInWithPassword(client: SupabaseClient, email: string, password: string) {
  return client.auth.signInWithPassword({ email, password });
}

export function signUp(
  client: SupabaseClient,
  email: string,
  password: string,
  metadata: Record<string, unknown>
) {
  return client.auth.signUp({ email, password, options: { data: metadata } });
}

export function signInAnonymously(client: SupabaseClient, metadata: Record<string, unknown>) {
  return client.auth.signInAnonymously({ options: { data: metadata } });
}

export function resetPasswordForEmail(client: SupabaseClient, email: string, redirectTo: string) {
  return client.auth.resetPasswordForEmail(email, { redirectTo });
}

export function updatePassword(client: SupabaseClient, password: string) {
  return client.auth.updateUser({ password });
}

/**
 * Envoie un code à usage unique à l'email indiqué — première étape de la
 * connexion patient par email (voir PatientEmailLogin.tsx / migration 069).
 * shouldCreateUser: true, car un patient qui n'a jamais eu de compte
 * "authenticated" (uniquement des sessions anonymes jusqu'ici) doit pouvoir
 * s'authentifier avec son email sans étape d'inscription séparée.
 */
export function requestPatientEmailCode(client: SupabaseClient, email: string) {
  return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
}

/** Deuxième étape : vérifie le code reçu et ouvre la session. */
export function verifyPatientEmailCode(client: SupabaseClient, email: string, token: string) {
  return client.auth.verifyOtp({ email, token, type: "email" });
}
