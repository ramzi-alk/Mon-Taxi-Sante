import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";

export interface SiteSettings {
  phone_number_visible: boolean;
}

export async function fetchSiteSettings(client: SupabaseClient): Promise<SiteSettings> {
  const { data, error } = await client
    .from("site_settings")
    .select("phone_number_visible")
    .eq("id", true)
    .single();

  if (error) {
    logger.error("siteSettings.fetchSiteSettings failed", { error: error.message });
    throw new Error(error.message);
  }
  return data;
}

/**
 * Same intent as usePhoneVisibility (src/hooks/usePhoneVisibility.ts) but
 * for server-side callers (emails) that can't use a React hook: fail open
 * to `true` on error so a transient fetch hiccup doesn't silently swallow
 * an email send that's otherwise best-effort itself (see src/server/email.ts).
 */
export async function fetchPhoneVisible(client: SupabaseClient): Promise<boolean> {
  try {
    const settings = await fetchSiteSettings(client);
    return settings.phone_number_visible;
  } catch {
    return true;
  }
}

export async function updatePhoneVisibility(
  client: SupabaseClient,
  visible: boolean,
  updatedBy: string | null
): Promise<void> {
  const { error } = await client
    .from("site_settings")
    .update({ phone_number_visible: visible, updated_at: new Date().toISOString(), updated_by: updatedBy })
    .eq("id", true);

  if (error) {
    logger.error("siteSettings.updatePhoneVisibility failed", { error: error.message });
    throw new Error(error.message);
  }
}
