-- =============================================================================
-- Mon Taxi Santé — Driver company name from SIRET lookup
-- The inscription form now resolves the SIRET against the public
-- "Recherche d'entreprises" API (api.gouv.fr) and stores the official
-- company name returned, so admins reviewing applications don't have to
-- look it up manually.
-- =============================================================================

ALTER TABLE public.drivers_details ADD COLUMN company_name TEXT;

COMMENT ON COLUMN public.drivers_details.company_name IS
  'Official company name (raison sociale) resolved from the SIRET via the Recherche d''entreprises API.';
