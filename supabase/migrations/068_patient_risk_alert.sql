-- Sprint 2 UX audit — le patient n'avait aucune visibilité quand sa course
-- restait sans chauffeur à l'approche du départ : seul un admin était alerté
-- (voir at-risk-bookings.ts / atRiskBookingsAlertEmail, migration 046). Cette
-- colonne permet au même cron d'envoyer AUSSI un email au patient, une seule
-- fois par réservation (jamais re-déclenché à chaque exécution quotidienne
-- du cron, contrairement à l'alerte admin qui, elle, doit rester répétée
-- tant que la course n'est pas résolue).

ALTER TABLE public.bookings
  ADD COLUMN patient_risk_alert_sent_at timestamptz;

COMMENT ON COLUMN public.bookings.patient_risk_alert_sent_at IS
  'Horodatage du seul email envoyé au patient pour le prévenir qu''aucun chauffeur n''a encore accepté sa course à l''approche du départ (cron at-risk-bookings.ts, atRiskPatientEmail). NULL tant qu''aucune alerte n''a été envoyée. Distinct de l''alerte admin (atRiskBookingsAlertEmail), qui reste envoyée à chaque exécution du cron tant que la course n''est pas résolue.';
