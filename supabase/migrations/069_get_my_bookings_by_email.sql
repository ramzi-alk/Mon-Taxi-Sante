-- Sprint 3 UX audit — le suivi patient (get_my_bookings, migration 016+) est
-- scopé à auth.uid(), donc à une session anonyme par appareil/navigateur :
-- un patient qui change d'appareil, vide son cache, ou passe par un autre
-- proche perd tout accès à son historique. Cette fonction ajoute une
-- deuxième voie, indépendante de patient_id/auth.uid(), pour un patient qui
-- s'authentifie avec un email vérifié (OTP, voir Step "Se connecter par
-- email" sur /mes-reservations) : elle retrouve toutes les réservations où
-- cet email apparaît comme patient_email OU booker_email, quel que soit
-- l'appareil ou la session anonyme qui les a créées.
--
-- N'affecte ni ne remplace get_my_bookings() ni la RLS existante sur
-- bookings — fonction additive, SECURITY DEFINER comme son homologue.

CREATE FUNCTION public.get_my_bookings_by_email()
RETURNS TABLE(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision,
  pickup_lng double precision, pickup_municipality text, dropoff_address text,
  dropoff_lat double precision, dropoff_lng double precision,
  pickup_datetime timestamptz, return_datetime timestamptz,
  vehicle_type booking_vehicle_type, trip_type trip_type,
  requires_wheelchair boolean, requires_stretcher boolean, requires_oxygen boolean,
  passenger_count smallint, estimated_price numeric, status booking_status,
  created_at timestamptz, patient_full_name text, patient_phone text,
  patient_email text, patient_birth_date date, cpam_status cpam_status,
  mutual_name text, medical_notes text, series_id uuid, series_index smallint,
  series_total smallint, driver_full_name text, driver_phone text,
  vehicle_brand text, vehicle_model text, vehicle_registration text,
  driver_rating_avg numeric, patient_rating_given smallint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
    b.pickup_municipality,
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.patient_phone, b.patient_email, b.patient_birth_date,
    b.cpam_status, b.mutual_name, b.medical_notes,
    b.series_id, b.series_index, b.series_total,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.full_name END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.phone END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_brand END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_model END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END,
    CASE WHEN b.driver_id IS NOT NULL THEN public.driver_average_rating(b.driver_id) END,
    br.rating
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
  LEFT JOIN public.booking_ratings br ON br.booking_id = b.id AND br.rater_role = 'patient'
  WHERE
    COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND auth.jwt() ->> 'email' IS NOT NULL
    AND lower(auth.jwt() ->> 'email') IN (
      lower(coalesce(b.patient_email, '')),
      lower(coalesce(b.booker_email, ''))
    )
  ORDER BY b.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_my_bookings_by_email() IS
  'Historique de réservations d''un patient authentifié par email vérifié (OTP), retrouvé par correspondance sur patient_email/booker_email plutôt que patient_id. Complète get_my_bookings() (scopé à auth.uid(), donc à un appareil) sans le modifier. Exclut explicitement les sessions anonymes (is_anonymous) même si elles portent le rôle authenticated.';

REVOKE ALL ON FUNCTION public.get_my_bookings_by_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_bookings_by_email() TO authenticated, anon;
