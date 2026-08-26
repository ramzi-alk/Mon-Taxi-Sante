-- Permet de forcer explicitement le département de rattachement CPAM (ADS
-- du chauffeur) dans compute_booking_price, au lieu de systématiquement le
-- déduire du code postal de l'adresse de départ. Utile pour le simulateur
-- de prix autonome de /tarifs-cpam, où l'utilisateur peut connaître son
-- département de rattachement sans que l'adresse de départ saisie le
-- reflète nécessairement. Nouveau paramètre optionnel en fin de liste
-- (défaut NULL) : le trigger bookings_set_distance_and_price (qui appelle
-- la fonction avec 8 arguments positionnels) n'est pas affecté et continue
-- de déduire le département depuis l'adresse, comme avant.
--
-- CREATE OR REPLACE ne remplace pas une fonction existante dès lors que la
-- liste de paramètres change (ça crée une surcharge distincte, ambiguë avec
-- l'ancienne) : on DROP explicitement l'ancienne signature 8-arguments
-- d'abord, comme le faisait déjà la migration 026 pour la version 4-arguments
-- précédente.
DROP FUNCTION IF EXISTS public.compute_booking_price(
  NUMERIC, booking_vehicle_type, trip_type, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT
);

CREATE FUNCTION public.compute_booking_price(
  p_distance_km            NUMERIC,
  p_vehicle_type           booking_vehicle_type,
  p_trip_type              trip_type,
  p_requires_wheelchair    BOOLEAN,
  p_pickup_datetime        TIMESTAMPTZ DEFAULT NULL,
  p_is_hospitalization     BOOLEAN     DEFAULT FALSE,
  p_pickup_address         TEXT        DEFAULT NULL,
  p_dropoff_address        TEXT        DEFAULT NULL,
  p_departement_override   TEXT        DEFAULT NULL
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
  -- Tarif km : département de rattachement explicite si fourni (même
  -- normalisation '0X' -> 'X' que departement_depuis_adresse), sinon
  -- déduit de l'adresse de départ.
  v_dept := COALESCE(
    NULLIF(ltrim(p_departement_override, '0'), ''),
    public.departement_depuis_adresse(COALESCE(p_pickup_address, ''))
  );
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
  'Département : p_departement_override si fourni, sinon déduit de p_pickup_address.';

REVOKE ALL ON FUNCTION public.compute_booking_price(
  NUMERIC, booking_vehicle_type, trip_type, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_booking_price(
  NUMERIC, booking_vehicle_type, trip_type, BOOLEAN, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT, TEXT
) TO authenticated, anon;
