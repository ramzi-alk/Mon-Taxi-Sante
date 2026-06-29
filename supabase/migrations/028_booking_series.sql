-- Trajets multiples / Série de soins : chaque séance devient une vraie
-- réservation distincte (dispatchable séparément aux chauffeurs), reliée aux
-- autres séances de la même série par series_id. series_index/series_total
-- ne sont renseignés que pour les réservations issues d'une série
-- (PMT déclarée + trip_type = 'multiple') ; NULL pour une réservation
-- simple ou aller-retour.

alter table bookings
  add column if not exists series_id uuid null,
  add column if not exists series_index smallint null,
  add column if not exists series_total smallint null;

comment on column bookings.series_id is
  'Identifiant commun à toutes les réservations d''une même série de soins (trip_type = multiple). NULL pour une réservation simple ou aller-retour.';
comment on column bookings.series_index is
  'Position (1-indexée) de cette séance dans la série. NULL hors série.';
comment on column bookings.series_total is
  'Nombre total de séances dans la série à laquelle appartient cette réservation. NULL hors série.';

create index if not exists bookings_series_id_idx
  on bookings (series_id)
  where series_id is not null;

-- get_my_bookings et lookup_booking_by_reference exposent désormais
-- series_id/series_index/series_total (entre medical_notes et
-- driver_full_name) pour permettre l'affichage du badge "Séance X/Y" côté
-- patient. CREATE OR REPLACE ne peut pas changer la liste de colonnes
-- d'une fonction RETURNS TABLE, d'où le DROP préalable (cf. migration 010/014).

drop function if exists public.get_my_bookings();

create function public.get_my_bookings()
returns table(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision, pickup_datetime timestamptz,
  return_datetime timestamptz, vehicle_type booking_vehicle_type, trip_type trip_type, requires_wheelchair boolean,
  requires_stretcher boolean, requires_oxygen boolean, passenger_count smallint, estimated_price numeric,
  status booking_status, created_at timestamptz, patient_full_name text, patient_phone text, patient_email text,
  patient_birth_date date, cpam_status cpam_status, mutual_name text, medical_notes text,
  series_id uuid, series_index smallint, series_total smallint,
  driver_full_name text, driver_phone text, vehicle_brand text, vehicle_model text, vehicle_registration text
)
language sql
stable security definer
set search_path to 'public'
as $function$
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
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
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
  WHERE b.patient_id = auth.uid()
  ORDER BY b.created_at DESC;
$function$;

revoke all on function public.get_my_bookings() from public;
grant execute on function public.get_my_bookings() to authenticated, anon;

comment on function public.get_my_bookings() is
  'Réservations de la session patiente courante (RLS via auth.uid()), avec infos chauffeur jointes une fois affecté et champs de série (series_id/series_index/series_total).';

drop function if exists public.lookup_booking_by_reference(text, text);

create function public.lookup_booking_by_reference(p_reference_code text, p_phone text)
returns table(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision, pickup_datetime timestamptz,
  return_datetime timestamptz, vehicle_type booking_vehicle_type, trip_type trip_type, requires_wheelchair boolean,
  requires_stretcher boolean, requires_oxygen boolean, passenger_count smallint, estimated_price numeric,
  status booking_status, created_at timestamptz, patient_full_name text, patient_phone text, patient_email text,
  patient_birth_date date, cpam_status cpam_status, mutual_name text, medical_notes text,
  series_id uuid, series_index smallint, series_total smallint,
  driver_full_name text, driver_phone text, vehicle_brand text, vehicle_model text, vehicle_registration text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
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

revoke all on function public.lookup_booking_by_reference(text, text) from public;
grant execute on function public.lookup_booking_by_reference(text, text) to authenticated, anon;

comment on function public.lookup_booking_by_reference(text, text) is
  'Récupère une réservation par référence + téléphone pour la récupération sans session (cookies effacés, autre appareil). Rate-limitée via booking_lookup_attempts. Inclut les champs de série.';
