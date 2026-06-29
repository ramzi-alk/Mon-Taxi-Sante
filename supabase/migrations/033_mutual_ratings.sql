-- =============================================================================
-- Mon Taxi Santé — Avis mutuels patient ↔ chauffeur (façon Uber)
--
-- Une fois une course "completed", le patient peut noter le chauffeur et le
-- chauffeur peut noter le patient (1 à 5 étoiles + commentaire optionnel,
-- max 500 caractères). Une seule note par rôle et par course
-- (UNIQUE(booking_id, rater_role)), non modifiable une fois soumise.
--
-- Pas de policy INSERT directe sur booking_ratings : toute écriture passe
-- par les fonctions SECURITY DEFINER ci-dessous, qui vérifient la propriété
-- de la course et son statut 'completed' avant d'insérer — même logique que
-- accept_ride/start_ride/complete_ride (migration 018).
--
-- Côté patient, deux chemins de preuve de propriété, comme pour
-- cancel_booking / cancel_booking_by_reference (migration 009/013) :
--   - rate_booking_as_patient(): session auth.uid() en cours, lève une
--     exception en cas d'erreur (pas de verrou anti-brute-force à protéger).
--   - rate_booking_as_patient_by_reference(): reference_code + phone (flow
--     de récupération sans session), retourne un TEXT plutôt que de lever,
--     pour ne jamais annuler l'écriture du verrou de brute-force commitée
--     juste avant (même raisonnement que cancel_booking_by_reference).
-- Côté chauffeur, toujours authentifié : rate_booking_as_driver().
--
-- get_my_bookings()/lookup_booking_by_reference() exposent en plus la note
-- moyenne du chauffeur (toutes courses confondues) et la note déjà donnée
-- par le patient pour CETTE course (NULL = pas encore noté), pour que
-- l'appli puisse afficher l'invite à noter une seule fois. Symétriquement,
-- bookings_active_for_driver expose la note déjà donnée par le chauffeur au
-- patient, et la note reçue du patient pour cette course une fois soumise.
-- get_my_driver_stats() expose la note moyenne du chauffeur connecté.
-- =============================================================================

CREATE TYPE public.booking_rating_role AS ENUM ('patient', 'driver');

CREATE TABLE public.booking_ratings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  rater_role   public.booking_rating_role NOT NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, rater_role)
);

COMMENT ON TABLE public.booking_ratings IS
  'Notation mutuelle post-course : une ligne par (booking, rôle). rater_role=''patient'' = note laissée par le patient au chauffeur ; rater_role=''driver'' = note laissée par le chauffeur au patient. Non modifiable une fois soumise (voir les fonctions rate_booking_as_*).';

CREATE INDEX idx_booking_ratings_booking ON public.booking_ratings(booking_id);

ALTER TABLE public.booking_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_ratings: patient read own"
  ON public.booking_ratings FOR SELECT
  USING (booking_id IN (SELECT id FROM public.bookings WHERE patient_id = auth.uid()));

CREATE POLICY "booking_ratings: driver read own"
  ON public.booking_ratings FOR SELECT
  USING (booking_id IN (SELECT id FROM public.bookings WHERE driver_id = auth.uid()));

CREATE POLICY "booking_ratings: admin all"
  ON public.booking_ratings FOR ALL
  USING (public.is_admin());

-- ─── driver_average_rating(): note moyenne d'un chauffeur (vue patient) ───

CREATE FUNCTION public.driver_average_rating(p_driver_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT ROUND(AVG(br.rating)::numeric, 1)
  FROM public.booking_ratings br
  JOIN public.bookings b ON b.id = br.booking_id
  WHERE b.driver_id = p_driver_id AND br.rater_role = 'patient';
$$;

COMMENT ON FUNCTION public.driver_average_rating IS
  'Note moyenne (1-5, 1 décimale) reçue par un chauffeur de la part des patients, toutes courses confondues. NULL si aucune note encore reçue.';

REVOKE ALL ON FUNCTION public.driver_average_rating(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_average_rating(UUID) TO authenticated, anon;

-- ─── rate_booking_as_patient(): session authentifiée ──────────────────────

CREATE FUNCTION public.rate_booking_as_patient(
  p_booking_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status booking_status;
BEGIN
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;

  SELECT status INTO v_status
  FROM public.bookings
  WHERE id = p_booking_id AND patient_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'booking_not_completed';
  END IF;

  INSERT INTO public.booking_ratings (booking_id, rater_role, rating, comment)
  VALUES (p_booking_id, 'patient', p_rating, p_comment)
  ON CONFLICT (booking_id, rater_role) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_rated';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rate_booking_as_patient IS
  'Notation du chauffeur par le patient connecté (session auth.uid() en cours), pour une course qui lui appartient et qui est terminée. Une seule note par course (already_rated sinon).';

REVOKE ALL ON FUNCTION public.rate_booking_as_patient(UUID, SMALLINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_booking_as_patient(UUID, SMALLINT, TEXT) TO authenticated;

-- ─── rate_booking_as_patient_by_reference(): flow de récupération ─────────

CREATE FUNCTION public.rate_booking_as_patient_by_reference(
  p_reference_code TEXT,
  p_phone TEXT,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(trim(p_reference_code));
  v_booking_id UUID;
  v_status booking_status;
BEGIN
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;

  PERFORM public.assert_lookup_not_locked(v_code);

  SELECT id, status INTO v_booking_id, v_status
  FROM public.bookings
  WHERE reference_code = v_code AND patient_phone = p_phone;

  PERFORM public.record_lookup_result(v_code, v_booking_id IS NOT NULL);

  IF v_booking_id IS NULL THEN
    RETURN 'booking_not_found';
  END IF;

  IF v_status <> 'completed' THEN
    RETURN 'booking_not_completed';
  END IF;

  INSERT INTO public.booking_ratings (booking_id, rater_role, rating, comment)
  VALUES (v_booking_id, 'patient', p_rating, p_comment)
  ON CONFLICT (booking_id, rater_role) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 'already_rated';
  END IF;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.rate_booking_as_patient_by_reference IS
  'Notation du chauffeur via le flow de récupération sans session (reference_code + phone, même preuve de propriété que lookup_booking_by_reference). Retourne un statut texte (ok / booking_not_found / booking_not_completed / already_rated) plutôt que de lever, pour ne jamais annuler le verrou anti-brute-force commité juste avant ; lève seulement too_many_attempts, qui se produit avant toute écriture.';

REVOKE ALL ON FUNCTION public.rate_booking_as_patient_by_reference(TEXT, TEXT, SMALLINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_booking_as_patient_by_reference(TEXT, TEXT, SMALLINT, TEXT) TO anon, authenticated;

-- ─── rate_booking_as_driver(): chauffeur note le patient ──────────────────

CREATE FUNCTION public.rate_booking_as_driver(
  p_booking_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status booking_status;
BEGIN
  IF p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;

  SELECT status INTO v_status
  FROM public.bookings
  WHERE id = p_booking_id AND driver_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'booking_not_completed';
  END IF;

  INSERT INTO public.booking_ratings (booking_id, rater_role, rating, comment)
  VALUES (p_booking_id, 'driver', p_rating, p_comment)
  ON CONFLICT (booking_id, rater_role) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_rated';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.rate_booking_as_driver IS
  'Notation du patient par le chauffeur connecté, pour une course qui lui est affectée et qui est terminée. Une seule note par course (already_rated sinon).';

REVOKE ALL ON FUNCTION public.rate_booking_as_driver(UUID, SMALLINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_booking_as_driver(UUID, SMALLINT, TEXT) TO authenticated;

-- ─── get_my_bookings() / lookup_booking_by_reference(): + colonnes notes ──
-- Ajoute driver_rating_avg (note moyenne du chauffeur, toutes courses) et
-- patient_rating_given (note déjà donnée par CE patient pour CETTE course,
-- NULL = pas encore noté) — colonnes ajoutées en fin de liste pour limiter
-- le diff avec la version précédente (migration 029).

DROP FUNCTION IF EXISTS public.get_my_bookings();

CREATE FUNCTION public.get_my_bookings()
RETURNS TABLE(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  pickup_municipality text,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision, pickup_datetime timestamptz,
  return_datetime timestamptz, vehicle_type booking_vehicle_type, trip_type trip_type, requires_wheelchair boolean,
  requires_stretcher boolean, requires_oxygen boolean, passenger_count smallint, estimated_price numeric,
  status booking_status, created_at timestamptz, patient_full_name text, patient_phone text, patient_email text,
  patient_birth_date date, cpam_status cpam_status, mutual_name text, medical_notes text,
  series_id uuid, series_index smallint, series_total smallint,
  driver_full_name text, driver_phone text, vehicle_brand text, vehicle_model text, vehicle_registration text,
  driver_rating_avg numeric, patient_rating_given smallint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  WHERE b.patient_id = auth.uid()
  ORDER BY b.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_my_bookings() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated, anon;

COMMENT ON FUNCTION public.get_my_bookings() IS
  'Réservations de la session patiente courante (RLS via auth.uid()), avec infos chauffeur jointes une fois affecté, champs de série, et désormais la note moyenne du chauffeur (driver_rating_avg) et la note déjà donnée par ce patient pour cette course (patient_rating_given, NULL = pas encore noté).';

DROP FUNCTION IF EXISTS public.lookup_booking_by_reference(text, text);

CREATE FUNCTION public.lookup_booking_by_reference(p_reference_code text, p_phone text)
RETURNS TABLE(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  pickup_municipality text,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision, pickup_datetime timestamptz,
  return_datetime timestamptz, vehicle_type booking_vehicle_type, trip_type trip_type, requires_wheelchair boolean,
  requires_stretcher boolean, requires_oxygen boolean, passenger_count smallint, estimated_price numeric,
  status booking_status, created_at timestamptz, patient_full_name text, patient_phone text, patient_email text,
  patient_birth_date date, cpam_status cpam_status, mutual_name text, medical_notes text,
  series_id uuid, series_index smallint, series_total smallint,
  driver_full_name text, driver_phone text, vehicle_brand text, vehicle_model text, vehicle_registration text,
  driver_rating_avg numeric, patient_rating_given smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT := upper(trim(p_reference_code));
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT bla.locked_until INTO v_locked_until
  FROM public.booking_lookup_attempts bla
  WHERE bla.reference_code = v_code;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;

  RETURN QUERY
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
  WHERE b.reference_code = v_code
    AND b.patient_phone = p_phone;

  IF FOUND THEN
    DELETE FROM public.booking_lookup_attempts bla WHERE bla.reference_code = v_code;
  ELSE
    INSERT INTO public.booking_lookup_attempts (reference_code, failed_count, locked_until, updated_at)
    VALUES (v_code, 1, NULL, now())
    ON CONFLICT (reference_code) DO UPDATE
      SET failed_count = booking_lookup_attempts.failed_count + 1,
          updated_at = now(),
          locked_until = CASE
            WHEN booking_lookup_attempts.failed_count + 1 >= 5
              THEN now() + interval '15 minutes'
            ELSE NULL
          END;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.lookup_booking_by_reference IS
  'Recovers a single booking by its human-friendly reference_code + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only, including driver info once assigned, series fields, and now driver_rating_avg / patient_rating_given (same as get_my_bookings). Locks out further attempts on a given reference_code for 15 minutes after 5 consecutive failed phone matches.';

-- ─── bookings_active_for_driver: + notes données/reçues pour le chauffeur ─

CREATE OR REPLACE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_address
    ELSE COALESCE(b.pickup_municipality, b.pickup_address)
  END AS pickup_address,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_lat
    ELSE NULL
  END AS pickup_lat,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_lng
    ELSE NULL
  END AS pickup_lng,
  b.dropoff_address,
  b.dropoff_lat,
  b.dropoff_lng,
  b.distance_km,
  b.pickup_datetime,
  b.return_datetime,
  b.vehicle_type,
  b.trip_type,
  b.requires_wheelchair,
  b.requires_stretcher,
  b.requires_oxygen,
  b.passenger_count,
  b.estimated_price,
  b.status,
  b.created_at,
  CASE
    WHEN b.status IN ('accepted', 'in_progress')
         AND dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL
         AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL
    THEN public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL
  END AS distance_to_driver_km,
  driver_br.rating AS driver_rating_given,
  patient_br.rating AS patient_rating_received
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
LEFT JOIN public.booking_ratings driver_br ON driver_br.booking_id = b.id AND driver_br.rater_role = 'driver'
LEFT JOIN public.booking_ratings patient_br ON patient_br.booking_id = b.id AND patient_br.rater_role = 'patient'
WHERE b.driver_id = auth.uid()
  AND b.status IN ('accepted', 'in_progress', 'completed');

COMMENT ON VIEW public.bookings_active_for_driver IS
  'Courses acceptées/en cours/terminées du chauffeur connecté (équivalent de fetchDriverRides), avec distance_to_driver_km, et désormais driver_rating_given (note que CE chauffeur a donnée au patient pour cette course, NULL = pas encore noté) et patient_rating_received (note que le patient a donnée au chauffeur pour cette course, visible dès soumission). L''adresse exacte de prise en charge reste masquée hors fenêtre de révélation (voir pickup_address_revealed, migration 031).';

-- ─── get_my_driver_stats(): + note moyenne ─────────────────────────────────

DROP FUNCTION IF EXISTS public.get_my_driver_stats();

CREATE FUNCTION public.get_my_driver_stats()
RETURNS TABLE (
  rides_completed BIGINT,
  total_km        NUMERIC,
  total_earnings  NUMERIC,
  rides_today     BIGINT,
  earnings_today  NUMERIC,
  average_rating  NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'completed'),
    COALESCE(sum(distance_km) FILTER (WHERE status = 'completed'), 0),
    COALESCE(sum(estimated_price) FILTER (WHERE status = 'completed'), 0),
    count(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE),
    COALESCE(sum(estimated_price) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE), 0),
    public.driver_average_rating(auth.uid())
  FROM public.bookings
  WHERE driver_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_driver_stats IS
  'Stats du chauffeur connecté (courses terminées, km et gains cumulés + du jour, note moyenne reçue des patients) pour le tableau de bord. Pas de SECURITY DEFINER : repose sur la policy RLS existante qui restreint déjà bookings aux lignes du chauffeur.';
