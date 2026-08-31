-- Ajoute la source "booking_step_date_urgent" au CHECK constraint de
-- call_button_clicks — nouveau CTA d'appel affiché dans Step3DateTime.tsx
-- (message d'urgence quand aucune date < J+1 n'est sélectionnable). Sans
-- cette valeur, track_call_button_click() ignorerait silencieusement ces
-- clics (voir son EXCEPTION WHEN check_violation, migration 052) : la
-- fonctionnalité continuerait de marcher, mais ne remonterait rien au
-- panel admin.

ALTER TABLE public.call_button_clicks
  DROP CONSTRAINT call_button_clicks_source_check;

ALTER TABLE public.call_button_clicks
  ADD CONSTRAINT call_button_clicks_source_check CHECK (source IN (
    'navbar',
    'footer',
    'booking_form_help',
    'error_boundary',
    'home_hero',
    'home_bottom_cta',
    'city_page',
    'hospital_page',
    'ald_page',
    'faq',
    'my_bookings',
    'booking_confirmation',
    'booking_step_date_urgent'
  ));
