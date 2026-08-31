-- Documentation uniquement (COMMENT ON FUNCTION) — aucun changement de
-- comportement. La formule tarifaire de compute_booking_price existe en
-- double avec src/lib/pricing.ts (calculatePrice), nécessaire côté client
-- pour estimer un prix avant qu'une ligne bookings n'existe. Ce commentaire
-- pointe vers l'implémentation JS miroir et le script de vérification de
-- parité (scripts/verify-pricing-parity.mjs, exécuté manuellement le
-- 2026-08-31 sur 5 cas représentatifs : formule synchronisée à cette date),
-- pour qu'une future évolution tarifaire touchant l'un pense à l'autre.

COMMENT ON FUNCTION public.compute_booking_price IS
  'Formule tarifaire convention nationale taxi 2025-2029 (applicable depuis le 1/11/2025). '
  'Forfait base 13 € (4 km inclus) + forfait grande ville 15 € + km facturables × tarif dép. '
  '+ retour à vide +25/50 % + majoration horaire 50 % + TPMR 30 €. '
  'Distance = haversine (sous-estime ~15-25 % vs Google Maps — tarif réel légèrement supérieur). '
  'ATTENTION : dupliquée dans src/lib/pricing.ts (calculatePrice) pour l''estimation '
  'client avant confirmation — toute évolution de la convention tarifaire doit être '
  'répercutée dans les deux implémentations. Vérifier avec '
  'scripts/verify-pricing-parity.mjs après modification de l''une ou l''autre.';
