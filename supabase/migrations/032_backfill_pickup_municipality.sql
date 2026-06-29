-- =============================================================================
-- Mon Taxi Santé — backfill de pickup_municipality (bug retrieveAddress)
--
-- src/lib/mapbox.ts dérivait jusqu'ici pickup_municipality uniquement depuis
-- properties.place_formatted de la réponse retrieve() de Mapbox. Ce champ
-- n'est pas toujours présent dans cette réponse (contrairement à l'endpoint
-- suggest), alors que geometry.coordinates l'est systématiquement : résultat,
-- pickup_lat/pickup_lng étaient correctement enregistrés mais
-- pickup_municipality restait NULL pour une partie des réservations. Le
-- masquage de l'adresse exacte dans le pool chauffeurs (migration 029,
-- COALESCE(b.pickup_municipality, b.pickup_address)) ne s'appliquait donc pas
-- : la commune retombait sur l'adresse complète.
--
-- Le code est corrigé (mapbox.ts reconstruit désormais la commune depuis
-- properties.context.postcode/place en repli), mais les réservations déjà
-- créées avec pickup_municipality NULL restent affectées. On les corrige ici
-- avec un best-effort : extraction par regex du couple "code postal + ville"
-- depuis pickup_address (format FR standard "<rue> <CP> <Ville>"), qui
-- couvre la totalité des lignes actuellement concernées.
-- =============================================================================

-- Limité aux courses futures (pickup_datetime > now()) : la contrainte CHECK
-- bookings_pickup_datetime_check est réévaluée sur tout UPDATE, y compris sur
-- des colonnes non concernées, et rejetterait les lignes déjà passées (cf.
-- même restriction dans la migration 026). Sans impact pratique puisque ces
-- anciennes courses ne sont plus exposées dans les vues pool/driver actives.
UPDATE public.bookings
SET pickup_municipality = substring(pickup_address from '(\d{5}\s+[^,]+)')
WHERE pickup_municipality IS NULL
  AND pickup_address ~ '\d{5}\s+[^,]+'
  AND pickup_datetime > now();
