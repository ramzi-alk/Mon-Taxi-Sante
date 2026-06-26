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
