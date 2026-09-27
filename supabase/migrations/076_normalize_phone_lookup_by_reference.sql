-- =============================================================================
-- Mon Taxi Santé — Recherche "Retrouver une réservation avec sa référence"
-- plus tolérante aux formats de téléphone
--
-- lookup_booking_by_reference / cancel_booking_by_reference /
-- update_booking_by_reference comparaient patient_phone par égalité stricte
-- (b.patient_phone = p_phone). Or patient_phone est stocké dans plusieurs
-- formats selon la source de saisie (+33612345678, 0033612345678,
-- 0612345678...) : un patient qui retape son numéro dans un format
-- différent de celui enregistré ne retrouvait jamais sa réservation, alors
-- même que la référence et le numéro étaient corrects.
--
-- normalize_phone_fr() réduit un numéro à son "numéro national
-- significatif" (les chiffres sans l'indicatif pays), même logique que
-- phoneSearchDigits côté TS (src/lib/phone.ts) pour la recherche admin —
-- ici appliquée aux deux côtés de la comparaison plutôt qu'en ilike, pour
-- que la vérification d'identité reste une égalité exacte sur le numéro
-- normalisé (pas de correspondance partielle sur un fragment de numéro).
--
-- En creusant lookup_booking_by_reference on a trouvé un second bug, plus
-- grave, sans rapport avec le format du téléphone : sur toute tentative
-- échouée (mauvaise référence OU mauvais téléphone), l'écriture du
-- rate-limit levait "column reference \"reference_code\" is ambiguous" —
-- RETURNS TABLE déclare un paramètre de sortie reference_code, que plpgsql
-- traite comme une variable dans toute la fonction, en conflit avec
-- "ON CONFLICT (reference_code)". Toute recherche qui ne correspondait à
-- rien plantait donc avec une erreur générique côté patient au lieu du
-- message "aucune réservation ne correspond", et le verrou anti-brute-force
-- (5 tentatives / 15 min) n'enregistrait en pratique jamais aucun échec.
-- Voir le commentaire sur l'INSERT plus bas pour le correctif.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_phone_fr(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');

  IF v_digits LIKE '0033%' THEN
    v_digits := substr(v_digits, 5);
  ELSIF v_digits LIKE '33%' AND length(v_digits) = 11 THEN
    v_digits := substr(v_digits, 3);
  ELSIF v_digits LIKE '0%' THEN
    v_digits := substr(v_digits, 2);
  END IF;

  RETURN v_digits;
END;
$$;

COMMENT ON FUNCTION public.normalize_phone_fr IS
  'Réduit un numéro de téléphone français à son numéro national significatif (les chiffres, sans indicatif +33/0033 ni le 0 initial), pour comparer deux numéros indépendamment du format de saisie. Utilisé par lookup/cancel/update_booking_by_reference pour la preuve de propriété reference_code + téléphone.';

-- ─── lookup_booking_by_reference ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lookup_booking_by_reference(p_reference_code text, p_phone text)
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
    AND public.normalize_phone_fr(b.patient_phone) = public.normalize_phone_fr(p_phone);

  IF FOUND THEN
    DELETE FROM public.booking_lookup_attempts bla WHERE bla.reference_code = v_code;
  ELSE
    -- "ON CONFLICT (reference_code)" est ambigu ici : RETURNS TABLE déclare
    -- un paramètre de sortie nommé reference_code, que plpgsql traite comme
    -- une variable visible dans tout le corps de la fonction, en conflit
    -- avec la colonne du même nom. Avant ce correctif, TOUTE tentative
    -- échouée (mauvais téléphone ou référence) faisait échouer cette
    -- requête avec "column reference is ambiguous" au lieu de renvoyer
    -- simplement aucune ligne — donc pas de message "aucune réservation ne
    -- correspond", une erreur générique côté patient, et le
    -- rate-limit anti-brute-force qui n'enregistrait jamais aucun échec.
    -- Cibler la contrainte plutôt que la colonne contourne l'ambiguïté (le
    -- DELETE juste au-dessus n'a pas ce problème : bla.reference_code y est
    -- déjà qualifié).
    INSERT INTO public.booking_lookup_attempts (reference_code, failed_count, locked_until, updated_at)
    VALUES (v_code, 1, NULL, now())
    ON CONFLICT ON CONSTRAINT booking_lookup_attempts_pkey DO UPDATE
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

COMMENT ON FUNCTION public.lookup_booking_by_reference IS
  'Recovers a single booking by its human-friendly reference_code + phone when the anonymous browser session backing RLS access is lost. Phone comparison is normalized (normalize_phone_fr) so +33/0033/0-prefixed formats all match the same stored number. Returns display-safe columns only, including driver info once assigned, series fields, and driver_rating_avg / patient_rating_given (same as get_my_bookings). Locks out further attempts on a given reference_code for 15 minutes after 5 consecutive failed phone matches (failure bookkeeping targets the booking_lookup_attempts_pkey constraint rather than the bare column, to avoid the reference_code OUT-parameter/column ambiguity).';

-- ─── cancel_booking_by_reference ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT,
  p_reason TEXT DEFAULT NULL
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
  PERFORM public.assert_lookup_not_locked(v_code);

  SELECT id, status INTO v_booking_id, v_status
  FROM public.bookings
  WHERE reference_code = v_code
    AND public.normalize_phone_fr(patient_phone) = public.normalize_phone_fr(p_phone);

  PERFORM public.record_lookup_result(v_code, v_booking_id IS NOT NULL);

  IF v_booking_id IS NULL THEN
    RETURN 'booking_not_found';
  END IF;

  IF v_status NOT IN ('pending', 'confirmed', 'available', 'accepted') THEN
    RETURN 'booking_not_cancellable';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancellation_reason = p_reason
  WHERE id = v_booking_id;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.cancel_booking_by_reference IS
  'Patient self-service cancellation via the lost-session recovery flow. Scoped to a booking matching reference_code and a phone comparison normalized by normalize_phone_fr (same proof of ownership as lookup_booking_by_reference, tolerant to +33/0033/0-prefixed formats); only allowed while the ride has not started. Returns a status string (ok / booking_not_found / booking_not_cancellable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write.';

-- ─── update_booking_by_reference ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT,
  p_pickup_address TEXT,
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_dropoff_address TEXT,
  p_dropoff_lat DOUBLE PRECISION,
  p_dropoff_lng DOUBLE PRECISION,
  p_pickup_datetime TIMESTAMPTZ,
  p_return_datetime TIMESTAMPTZ,
  p_vehicle_type booking_vehicle_type,
  p_trip_type trip_type,
  p_requires_wheelchair BOOLEAN,
  p_requires_stretcher BOOLEAN,
  p_requires_oxygen BOOLEAN,
  p_passenger_count SMALLINT,
  p_cpam_status cpam_status,
  p_mutual_name TEXT,
  p_medical_notes TEXT,
  p_distance_km NUMERIC DEFAULT NULL,
  p_pickup_municipality TEXT DEFAULT NULL
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
  PERFORM public.assert_lookup_not_locked(v_code);

  SELECT id, status INTO v_booking_id, v_status
  FROM public.bookings
  WHERE reference_code = v_code
    AND public.normalize_phone_fr(patient_phone) = public.normalize_phone_fr(p_phone);

  PERFORM public.record_lookup_result(v_code, v_booking_id IS NOT NULL);

  IF v_booking_id IS NULL THEN
    RETURN 'booking_not_found';
  END IF;

  IF v_status <> 'pending' THEN
    RETURN 'booking_not_editable';
  END IF;

  UPDATE public.bookings
  SET
    pickup_address = p_pickup_address,
    pickup_lat = p_pickup_lat,
    pickup_lng = p_pickup_lng,
    pickup_municipality = p_pickup_municipality,
    dropoff_address = p_dropoff_address,
    dropoff_lat = p_dropoff_lat,
    dropoff_lng = p_dropoff_lng,
    distance_km = p_distance_km,
    pickup_datetime = p_pickup_datetime,
    return_datetime = p_return_datetime,
    vehicle_type = p_vehicle_type,
    trip_type = p_trip_type,
    requires_wheelchair = p_requires_wheelchair,
    requires_stretcher = p_requires_stretcher,
    requires_oxygen = p_requires_oxygen,
    passenger_count = p_passenger_count,
    cpam_status = p_cpam_status,
    mutual_name = p_mutual_name,
    medical_notes = p_medical_notes
  WHERE id = v_booking_id;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.update_booking_by_reference IS
  'Patient self-service edit via the lost-session recovery flow. Scoped to a booking matching reference_code and a phone comparison normalized by normalize_phone_fr (same proof of ownership as lookup_booking_by_reference, tolerant to +33/0033/0-prefixed formats); only allowed while still pending. Returns a status string (ok / booking_not_found / booking_not_editable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write. p_distance_km est la distance routière réelle recalculée côté app (Mapbox Directions) au moment de la modification, NULL si indisponible (fallback Haversine du trigger). p_pickup_municipality maintient à jour le champ utilisé pour masquer l''adresse exacte dans le pool chauffeur.';
