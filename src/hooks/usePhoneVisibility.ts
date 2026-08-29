import { useQuery } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";
import * as siteSettingsRepository from "~/repositories/siteSettingsRepository";

/**
 * Whether the standard contact number (src/lib/contact.ts) should be shown
 * on public pages, per the admin toggle (/admin/parametres). Defaults to
 * `true` while loading or on error — fail open, since the number being
 * shown is the normal state and a transient fetch hiccup shouldn't hide it.
 */
export function usePhoneVisibility(): boolean {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => siteSettingsRepository.fetchSiteSettings(supabase),
    staleTime: 60_000,
  });

  return data?.phone_number_visible ?? true;
}
