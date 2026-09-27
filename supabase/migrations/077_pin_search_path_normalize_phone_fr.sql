-- normalize_phone_fr (migration 076) manquait un search_path fixe — repéré
-- par l'advisor sécurité Supabase juste après coup (function_search_path_mutable),
-- même classe de correctif que 034_pin_search_path_distance_functions pour
-- les fonctions de calcul de distance.

CREATE OR REPLACE FUNCTION public.normalize_phone_fr(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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
