-- =============================================================================
-- Migration 026 — Calcul tarifaire convention nationale taxi 2025–2029
--
-- Remplace l'ancienne formule (baseFare 2.60 € + 1.21 €/km) par la convention
-- applicable depuis le 1er novembre 2025 :
--   forfait base 13 € (4 km inclus)
--   + forfait grande ville 15 € (si prise en charge ou dépose en grande ville)
--   + km facturables × tarif départemental (de 1.07 à 1.27 €/km)
--   + retour à vide +25 % (≤ 49 km) / +50 % (≥ 50 km) si hospitalisation
--   + majoration horaire 50 % (20h-8h, sam >12h, dim, jours fériés)
--   + supplément TPMR 30 € si fauteuil roulant
--
-- Fonctions créées / remplacées :
--   paques_date(year)           — date de Pâques (algorithme de Gauss)
--   est_jour_ferie_fr(date)     — vrai si jour férié français
--   a_majoration_horaire(ts)    — vrai si plage majorée 50 %
--   departement_depuis_adresse(text) — code dép. INSEE depuis code postal
--   tarif_km_departement(text)  — €/km pour un code département
--   est_grande_ville(text)      — vrai si adresse en grande ville
--   compute_booking_price(...)  — nouvelle signature + formule 2025
--   bookings_set_distance_and_price() — trigger mis à jour
-- =============================================================================

-- ─── 1. Pâques (algorithme de Gauss / Butcher) ────────────────────────────

CREATE OR REPLACE FUNCTION public.paques_date(p_annee INT)
RETURNS DATE
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  a INT := p_annee % 19;
  b INT := p_annee / 100;
  c INT := p_annee % 100;
  d INT := b / 4;
  e INT := b % 4;
  f INT := (b + 8) / 25;
  g INT := (b - f + 1) / 3;
  h INT := (19*a + b - d - g + 15) % 30;
  i INT := c / 4;
  k INT := c % 4;
  l INT := (32 + 2*e + 2*i - h - k) % 7;
  m INT := (a + 11*h + 22*l) / 451;
  v_mois INT := (h + l - 7*m + 114) / 31;
  v_jour INT := ((h + l - 7*m + 114) % 31) + 1;
BEGIN
  RETURN make_date(p_annee, v_mois, v_jour);
END;
$$;

REVOKE ALL ON FUNCTION public.paques_date(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.paques_date(INT) TO authenticated, anon;

-- ─── 2. Jours fériés français ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.est_jour_ferie_fr(p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  v_paques DATE := public.paques_date(EXTRACT(YEAR FROM p_date)::INT);
BEGIN
  -- Jours fériés fixes
  IF to_char(p_date, 'MM-DD') IN (
    '01-01', -- Nouvel An
    '05-01', -- Fête du Travail
    '05-08', -- Victoire 1945
    '07-14', -- Fête Nationale
    '08-15', -- Assomption
    '11-01', -- Toussaint
    '11-11', -- Armistice
    '12-25'  -- Noël
  ) THEN RETURN TRUE; END IF;
  -- Jours fériés variables (Pâques)
  IF p_date IN (
    v_paques + INTERVAL '1 day',  -- Lundi de Pâques
    v_paques + INTERVAL '39 days', -- Ascension
    v_paques + INTERVAL '50 days'  -- Lundi de Pentecôte
  ) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.est_jour_ferie_fr(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.est_jour_ferie_fr(DATE) TO authenticated, anon;

-- ─── 3. Majoration horaire 50 % ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.a_majoration_horaire(p_datetime TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  v_local TIMESTAMPTZ := p_datetime AT TIME ZONE 'Europe/Paris';
  v_heure  INT := EXTRACT(HOUR FROM v_local)::INT;
  v_dow    INT := EXTRACT(DOW  FROM v_local)::INT;  -- 0=dim, 6=sam
BEGIN
  IF v_heure >= 20 OR v_heure < 8 THEN RETURN TRUE; END IF;
  IF v_dow = 0 THEN RETURN TRUE; END IF;            -- Dimanche
  IF v_dow = 6 AND v_heure >= 12 THEN RETURN TRUE; END IF; -- Sam après 12h
  IF public.est_jour_ferie_fr(v_local::DATE) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.a_majoration_horaire(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.a_majoration_horaire(TIMESTAMPTZ) TO authenticated, anon;

-- ─── 4. Département INSEE depuis adresse (code postal) ───────────────────

CREATE OR REPLACE FUNCTION public.departement_depuis_adresse(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_postal TEXT;
  v_pref2  TEXT;
BEGIN
  v_postal := (regexp_match(p_address, '\y(\d{5})\y'))[1];
  IF v_postal IS NULL THEN RETURN NULL; END IF;
  v_pref2 := left(v_postal, 2);
  IF v_pref2 = '20' THEN
    -- Corse: 200xx → 2A, 201xx → 2B
    IF left(v_postal, 3)::INT <= 200 THEN RETURN '2A'; ELSE RETURN '2B'; END IF;
  END IF;
  IF v_pref2 = '97' THEN RETURN left(v_postal, 3); END IF;
  RETURN ltrim(v_pref2, '0');  -- '01' → '1', etc.
END;
$$;

REVOKE ALL ON FUNCTION public.departement_depuis_adresse(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.departement_depuis_adresse(TEXT) TO authenticated, anon;

-- ─── 5. Tarif kilométrique par département (annexe convention 2025, p.18) ─

CREATE OR REPLACE FUNCTION public.tarif_km_departement(p_code TEXT)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_code
    WHEN '1'   THEN 1.13  WHEN '2'   THEN 1.20  WHEN '3'   THEN 1.19
    WHEN '4'   THEN 1.14  WHEN '5'   THEN 1.18  WHEN '6'   THEN 1.27
    WHEN '7'   THEN 1.17  WHEN '8'   THEN 1.17  WHEN '9'   THEN 1.15
    WHEN '10'  THEN 1.13  WHEN '11'  THEN 1.08  WHEN '12'  THEN 1.16
    WHEN '13'  THEN 1.10  WHEN '14'  THEN 1.07  WHEN '15'  THEN 1.13
    WHEN '16'  THEN 1.12  WHEN '17'  THEN 1.10  WHEN '18'  THEN 1.26
    WHEN '19'  THEN 1.16  WHEN '2A'  THEN 1.27  WHEN '2B'  THEN 1.27
    WHEN '21'  THEN 1.12  WHEN '22'  THEN 1.13  WHEN '23'  THEN 1.18
    WHEN '24'  THEN 1.11  WHEN '25'  THEN 1.08  WHEN '26'  THEN 1.16
    WHEN '27'  THEN 1.21  WHEN '28'  THEN 1.19  WHEN '29'  THEN 1.07
    WHEN '30'  THEN 1.08  WHEN '31'  THEN 1.10  WHEN '32'  THEN 1.19
    WHEN '33'  THEN 1.07  WHEN '34'  THEN 1.07  WHEN '35'  THEN 1.07
    WHEN '36'  THEN 1.25  WHEN '37'  THEN 1.18  WHEN '38'  THEN 1.22
    WHEN '39'  THEN 1.11  WHEN '40'  THEN 1.13  WHEN '41'  THEN 1.13
    WHEN '42'  THEN 1.08  WHEN '43'  THEN 1.24  WHEN '44'  THEN 1.08
    WHEN '45'  THEN 1.07  WHEN '46'  THEN 1.13  WHEN '47'  THEN 1.11
    WHEN '48'  THEN 1.25  WHEN '49'  THEN 1.08  WHEN '50'  THEN 1.16
    WHEN '51'  THEN 1.12  WHEN '52'  THEN 1.26  WHEN '53'  THEN 1.09
    WHEN '54'  THEN 1.09  WHEN '55'  THEN 1.12  WHEN '56'  THEN 1.07
    WHEN '57'  THEN 1.14  WHEN '58'  THEN 1.27  WHEN '59'  THEN 1.20
    WHEN '60'  THEN 1.20  WHEN '61'  THEN 1.17  WHEN '62'  THEN 1.20
    WHEN '63'  THEN 1.08  WHEN '64'  THEN 1.14  WHEN '65'  THEN 1.07
    WHEN '66'  THEN 1.18  WHEN '67'  THEN 1.07  WHEN '68'  THEN 1.07
    WHEN '69'  THEN 1.07  WHEN '70'  THEN 1.08  WHEN '71'  THEN 1.10
    WHEN '72'  THEN 1.07  WHEN '73'  THEN 1.15  WHEN '74'  THEN 1.22
    WHEN '75'  THEN 1.22  WHEN '76'  THEN 1.18  WHEN '77'  THEN 1.07
    WHEN '78'  THEN 1.07  WHEN '79'  THEN 1.08  WHEN '80'  THEN 1.15
    WHEN '81'  THEN 1.07  WHEN '82'  THEN 1.07  WHEN '83'  THEN 1.16
    WHEN '84'  THEN 1.20  WHEN '85'  THEN 1.07  WHEN '86'  THEN 1.11
    WHEN '87'  THEN 1.10  WHEN '88'  THEN 1.10  WHEN '89'  THEN 1.11
    WHEN '90'  THEN 1.08  WHEN '91'  THEN 1.07  WHEN '92'  THEN 1.07
    WHEN '93'  THEN 1.07  WHEN '94'  THEN 1.07  WHEN '95'  THEN 1.07
    WHEN '971' THEN 1.07  WHEN '972' THEN 1.20  WHEN '973' THEN 1.10
    WHEN '974' THEN 1.22  WHEN '976' THEN 0.00
    ELSE 1.10  -- tarif médian par défaut
  END;
$$;

REVOKE ALL ON FUNCTION public.tarif_km_departement(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tarif_km_departement(TEXT) TO authenticated, anon;

-- ─── 6. Détection grande ville (convention 2025 + liste CNAM 01/04/2026) ──

CREATE OR REPLACE FUNCTION public.est_grande_ville(p_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_postal TEXT;
  v_pref2  TEXT;
BEGIN
  IF p_address IS NULL THEN RETURN FALSE; END IF;
  v_postal := (regexp_match(p_address, '\y(\d{5})\y'))[1];
  IF v_postal IS NULL THEN RETURN FALSE; END IF;
  v_pref2 := left(v_postal, 2);
  -- Départements 92/93/94 et Paris (75) → toujours grande ville
  IF v_pref2 IN ('92','93','94','75') THEN RETURN TRUE; END IF;
  -- Codes postaux spécifiques des grandes villes et établissements par extension
  IF v_postal = ANY(ARRAY[
    -- Bordeaux (33)
    '33000','33100','33200','33300','33800','33270','33520','33600','33310','33110','33185','33400',
    -- Grenoble (38)
    '38000','38100','38700','38130',
    -- Lille (59)
    '59000','59800','59120','59491','59650','59155','59130','59370','59160',
    -- Lyon (69)
    '69001','69002','69003','69004','69005','69006','69007','69008','69009',
    '69300','69100','69500','69130','69110',
    -- Marseille (13)
    '13001','13002','13003','13004','13005','13006','13007','13008',
    '13009','13010','13011','13012','13013','13014','13015','13016',
    -- Montpellier (34)
    '34000','34070','34080','34090','34430','34170','34790',
    -- Nantes (44)
    '44000','44100','44200','44300','44800','44400',
    -- Nice (06)
    '06000','06100','06200','06300','06700',
    -- Rennes (35)
    '35000','35200','35510','35760','35135',
    -- Strasbourg (67)
    '67000','67100','67300','67400',
    -- Toulouse (31)
    '31000','31100','31200','31300','31400','31500','31130','31240'
  ]) THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.est_grande_ville(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.est_grande_ville(TEXT) TO authenticated, anon;

-- ─── 7. Remplacer compute_booking_price (ancienne signature 4 args) ────────

DROP TRIGGER IF EXISTS bookings_distance_and_price ON public.bookings;

DROP FUNCTION IF EXISTS public.compute_booking_price(
  NUMERIC, booking_vehicle_type, trip_type, BOOLEAN
);

-- ─── 8. Nouvelle compute_booking_price — convention 2025 ──────────────────

CREATE FUNCTION public.compute_booking_price(
  p_distance_km         NUMERIC,
  p_vehicle_type        booking_vehicle_type,
  p_trip_type           trip_type,
  p_requires_wheelchair BOOLEAN,
  p_pickup_datetime     TIMESTAMPTZ DEFAULT NULL,
  p_is_hospitalization  BOOLEAN     DEFAULT FALSE,
  p_pickup_address      TEXT        DEFAULT NULL,
  p_dropoff_address     TEXT        DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  -- Tarifs convention 2025
  v_forfait_base       NUMERIC := 13.00;
  v_km_inclus          NUMERIC := 4;
  v_forfait_gv         NUMERIC := 15.00;
  v_supplement_tpmr    NUMERIC := 30.00;

  -- Variables de calcul
  v_dept               TEXT;
  v_tarif_km           NUMERIC;
  v_grande_ville       BOOLEAN := FALSE;
  v_km_facturables     NUMERIC;
  v_montant_km         NUMERIC;
  v_majoration_rv      NUMERIC := 0;
  v_montant_rv         NUMERIC := 0;
  v_base               NUMERIC;
  v_majoration_h       NUMERIC := 0;
  v_tpmr               NUMERIC := 0;
  v_total              NUMERIC;
BEGIN
  -- Tarif km : département extrait de l'adresse de départ
  v_dept    := public.departement_depuis_adresse(COALESCE(p_pickup_address, ''));
  v_tarif_km := public.tarif_km_departement(v_dept);

  -- Forfait grande ville
  IF public.est_grande_ville(COALESCE(p_pickup_address, ''))
     OR public.est_grande_ville(COALESCE(p_dropoff_address, ''))
  THEN v_grande_ville := TRUE; END IF;

  -- Kilomètres facturables (au-delà des 4 inclus dans le forfait)
  v_km_facturables := GREATEST(0, COALESCE(p_distance_km, 0) - v_km_inclus);
  v_montant_km     := v_km_facturables * v_tarif_km;

  -- Retour à vide (hospitalisation / soins répétés)
  IF COALESCE(p_is_hospitalization, FALSE) AND COALESCE(p_distance_km, 0) > 0 THEN
    v_majoration_rv := CASE WHEN p_distance_km <= 49 THEN 0.25 ELSE 0.50 END;
    -- Retour à vide : km totaux (pas de déduction des 4 inclus) × tarif majoré
    v_montant_rv := p_distance_km * v_tarif_km * (1 + v_majoration_rv);
  END IF;

  -- Base avant majoration horaire
  v_base := v_forfait_base
    + (CASE WHEN v_grande_ville THEN v_forfait_gv ELSE 0 END)
    + v_montant_km
    + v_montant_rv;

  -- Majoration horaire 50 %
  IF p_pickup_datetime IS NOT NULL AND public.a_majoration_horaire(p_pickup_datetime) THEN
    v_majoration_h := v_base * 0.50;
  END IF;

  -- Supplément TPMR (hors majoration horaire selon convention)
  IF COALESCE(p_requires_wheelchair, FALSE) THEN
    v_tpmr := v_supplement_tpmr;
  END IF;

  v_total := v_base + v_majoration_h + v_tpmr;

  RETURN ROUND(v_total, 2);
END;
$$;

COMMENT ON FUNCTION public.compute_booking_price IS
  'Formule tarifaire convention nationale taxi 2025-2029 (applicable depuis le 1/11/2025). '
  'Forfait base 13 € (4 km inclus) + forfait grande ville 15 € + km facturables × tarif dép. '
  '+ retour à vide +25/50 % + majoration horaire 50 % + TPMR 30 €. '
  'Distance = haversine (sous-estime ~15-25 % vs Google Maps — tarif réel légèrement supérieur).';

REVOKE ALL ON FUNCTION public.compute_booking_price(
  NUMERIC, booking_vehicle_type, trip_type, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_booking_price(
  NUMERIC, booking_vehicle_type, trip_type, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT
) TO authenticated, anon;

-- ─── 9. Trigger function mis à jour ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bookings_set_distance_and_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL
     AND NEW.dropoff_lat IS NOT NULL AND NEW.dropoff_lng IS NOT NULL THEN
    NEW.distance_km := public.haversine_km(
      NEW.pickup_lat, NEW.pickup_lng,
      NEW.dropoff_lat, NEW.dropoff_lng
    );
    NEW.estimated_price := public.compute_booking_price(
      NEW.distance_km,
      NEW.vehicle_type,
      NEW.trip_type,
      NEW.requires_wheelchair,
      NEW.pickup_datetime,
      NEW.is_hospitalization,
      NEW.pickup_address,
      NEW.dropoff_address
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bookings_set_distance_and_price IS
  'Recalcule distance_km (Haversine) et estimated_price (tarif convention 2025) à chaque '
  'modification des coordonnées, du type de course, de l''adresse ou du flag hospitalisation.';

-- ─── 10. Recréer le trigger (colonne étendue : pickup_datetime, is_hospitalization, adresses) ──

CREATE TRIGGER bookings_distance_and_price
  BEFORE INSERT OR UPDATE OF
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    vehicle_type, trip_type, requires_wheelchair,
    pickup_datetime, is_hospitalization,
    pickup_address, dropoff_address
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_set_distance_and_price();

-- ─── 11. Backfill : recalculer estimated_price pour les courses à venir ──

-- La mise à jour de pickup_lat déclenche le trigger qui recalcule tout.
-- On ne touche que les courses futures pour éviter d'échouer sur les
-- contraintes CHECK (pickup_datetime > now()) des courses passées.
UPDATE public.bookings
SET pickup_lat = pickup_lat
WHERE pickup_lat IS NOT NULL
  AND pickup_lng IS NOT NULL
  AND dropoff_lat IS NOT NULL
  AND dropoff_lng IS NOT NULL
  AND pickup_datetime > now();
