import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";

// Doit rester synchronisé avec le CHECK constraint de call_button_clicks
// (migration 052) et couvrir chaque endroit du site où un CTA "Appeler"
// pointe vers le numéro standard (src/lib/contact.ts). Les appels dynamiques
// patient<->chauffeur (BookingStatusCard/RideCard) ne sont pas trackés ici.
export type CallButtonSource =
  | "navbar"
  | "footer"
  | "booking_form_help"
  | "error_boundary"
  | "home_hero"
  | "home_bottom_cta"
  | "city_page"
  | "hospital_page"
  | "ald_page"
  | "faq"
  | "my_bookings"
  | "booking_confirmation";

/**
 * Compte, pour le panel admin, un clic sur un CTA "Appeler". Fire-and-forget :
 * ne doit jamais retarder ni empêcher le lien tel: natif.
 */
export function trackCallButtonClick(source: CallButtonSource): void {
  void supabase
    .rpc("track_call_button_click", { p_source: source })
    .then(({ error }) => {
      if (error) {
        logger.error("trackCallButtonClick failed", { source, error: error.message });
      }
    });
}
