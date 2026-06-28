-- Commune où le chauffeur stationne/est basé, renseignée à l'inscription.
ALTER TABLE public.drivers_details
  ADD COLUMN parking_municipality TEXT;
