# Tableau de bord chauffeur — plan de sprints

> Complète `ROADMAP-CHAUFFEUR.md` (roadmap fonctionnelle par sprint) et
> `DRIVER_UX_AUDIT.md` (audit UX/UI du 2026-06-29) avec les constats d'une
> analyse produit plus récente axée fiabilité opérationnelle, conformité et
> revenu réel — voir ces deux fichiers pour l'historique déjà livré
> (cycle de vie de course, disponibilité, son/vibration, countdown, nav GPS,
> heartbeat, gestion des séries…).
>
> Coché = livré dans le code. Sprints de ~2 semaines pour une petite équipe.

---

## ⚠️ Important : badge PMT à conserver tel quel

Le badge « PMT déclarée : Oui/Non » (`RideCard.tsx`) reste **affiché en
permanence**, au même niveau que l'adresse/la distance — **ne pas** le
déplacer dans les détails dépliables. PMT = Prescription Médicale de
Transport, la pièce qui conditionne le remboursement CPAM de la course :
c'est une information de premier plan pour la décision d'acceptation du
chauffeur, pas un détail secondaire.

---

## Sprint 1 — Fiabilité & quick wins ✅ Livré

- [x] **Détection de chevauchement d'horaires à l'acceptation.**
      `accept_ride()` bloque désormais l'acceptation d'une course dont la
      fenêtre estimée (pickup → pickup/retour + durée ~2 min/km, plancher
      20 min) chevauche une autre course déjà `accepted`/`in_progress` du
      même chauffeur, marge de battement de 20 min. Nouvelle erreur
      `schedule_conflict`. Voir migration `056_accept_ride_schedule_conflict.sql`
      (reprend intégralement le corps de la version migration 030 — suspension
      de pool, `accepted_at` — pour ne pas régresser dessus).
- [x] **Motif d'annulation obligatoire.** `cancel_ride_by_driver(p_booking_id,
      p_reason)` exige désormais un motif, stocké dans
      `bookings.cancellation_reason` (colonne déjà présente au schéma,
      jusque-là utilisée uniquement côté patient). L'algorithme de détection
      d'annulation suspecte (< 10 min après acceptation, pickup à > 2h) n'est
      *pas encore* changé — cette itération capture juste le motif pour que
      l'admin puisse arbitrer, plutôt que de changer l'automatisme sans recul
      sur les motifs réels. Voir migration
      `057_cancel_ride_by_driver_reason.sql`, nouveau composant
      `src/components/driver/CancelReasonForm.tsx` (Select + Textarea
      shadcn/ui, motifs prédéfinis + "Autre"), branché dans `RideCard.tsx`
      (course seule et série) et `chauffeur_.course.$id.tsx`.
- [x] **Bandeau proactif d'échéance d'abonnement.** `subscription_status` /
      `subscription_ends_at` (déjà en base, déjà affichés en lecture seule sur
      "Mon compte") sont maintenant repris dans `fetchMyAvailability` pour
      afficher un bandeau dismissible sur le tableau de bord dès J-7,
      renvoyant vers "Mon compte". Le dismiss est gardé en `localStorage`,
      keyé par la date d'échéance — il réapparaît naturellement au cycle de
      facturation suivant.
- [x] **Bannière d'activation des notifications push.** Affichée tant que
      `push.isSupported && permission === "default" && !isSubscribed`, avec
      CTA direct vers `push.subscribe()`, dismissible (persistée en
      `localStorage`). Remplace la découverte fortuite de la petite icône
      `RadioTower` dans l'en-tête stats.
- [x] **Persistance du tri et de la vue du pool.** `sortBy` et `viewMode`
      (`PoolList.tsx`) sont sauvegardés en `localStorage`. Choix délibéré de
      **ne pas** persister la recherche texte ni "Besoins spécifiques" : un
      filtre oublié actif d'une session précédente masquerait silencieusement
      des courses disponibles au chauffeur sans qu'il s'en rende compte.
- [x] **Suppression du doublon "Courses disponibles".** Le compteur était
      affiché deux fois à quelques pixels d'écart (`StatCard` dédiée + badge
      sur l'onglet "Pool"). La `StatCard` autonome est retirée, le badge de
      l'onglet reste seul.
- [x] **Test Playwright du service worker de notifications push**
      (`e2e/push-notifications.spec.ts`) — voir section dédiée ci-dessous.

### Constats complémentaires (hors ticket, découverts en cours de route)

- **`accept_series` n'a pas de migration dans le dépôt.** Le frontend
  (`bookingsRepository.acceptSeriesRides`) et `database.types.ts` référencent
  une RPC `accept_series`, mais aucun fichier sous `supabase/migrations/` ne
  la définit (contrairement à `cancel_series`, présente en migration 038).
  Soit elle a été créée hors migration (drift schéma ↔ dépôt), soit elle
  n'existe pas réellement en base — dans les deux cas, à vérifier avant de
  faire confiance à ce chemin de code. Non traité dans ce sprint (hors
  périmètre initial), à investiguer en priorité avant Sprint 2.
- **Deux chemins redondants pour annuler une série.** Le tableau de bord
  (`cancelSeriesMutation` dans `chauffeur.tsx`) boucle sur
  `cancel_ride_by_driver` par course plutôt que d'appeler la RPC dédiée
  `cancel_series` (un seul appel, un seul événement d'annulation suspecte
  pour toute la série — voir migration 038). `bookingsRepository.cancelSeriesRides`
  (qui appelle bien `cancel_series`) semble donc mort côté UI. À trancher :
  brancher l'UI sur `cancel_series` (plus juste vis-à-vis du chauffeur) ou
  supprimer le code mort.

---

## Sprint 2 — Conformité & confiance

- [ ] Centre de documents chauffeur (upload + date d'expiration + statut),
      en réutilisant `storageRepository.uploadFile` déjà en place.
- [ ] Détail des annulations suspectes visible chauffeur + admin (exploite le
      motif capturé en Sprint 1).
- [ ] Indicateurs de performance personnels (taux acceptation/annulation,
      tendance de note).
- [ ] Écran unique "Préférences de courses" (fusion rayon d'acceptation +
      filtres véhicule/accessibilité).

## Sprint 3 — Productivité chauffeur (carte & planning)

- [ ] Vue "Ma journée" chronologique avec alertes de chevauchement (réutilise
      la logique du Sprint 1).
- [ ] Mini-carte pool + itinéraire du jour (`src/lib/mapbox.ts` déjà intégré
      au projet).
- [ ] Simplifier les CTA d'une carte pool en série (1 seul bouton "Accepter"
      au lieu de 3 concurrents).
- [ ] Refactor `RideCard.tsx` en sous-composants par statut — à faire avant
      d'alourdir encore ce composant avec les tickets Sprint 4.

## Sprint 4 — Revenu réel & différenciants

- [ ] CA réel ajustable + export comptable (CSV/PDF), au lieu de l'estimation
      Haversine actuelle (`estimated_price`).
- [ ] Justificatif de transport PDF auto-généré (`picked_up_at`/`completed_at`
      déjà stampés).
- [ ] Tags non-identifiants sur les points de RDV (accès difficile, etc.) —
      étend le pattern déjà en prod (`patient_rating_avg`, migration 035).
- [ ] Programme de parrainage chauffeur.

## Backlog (non séquencé)

- [ ] Canal support/signalement d'incident intégré.
- [ ] Auto-priorité "abonnement" à un patient en série récurrente — à valider
      avec de vrais retours chauffeurs avant de lancer.
- [ ] Harmonisation du pattern de confirmation inline dans
      `RideCard.tsx`/`PoolRideRow.tsx`.

---

## Tests — notifications push (Playwright)

`e2e/push-notifications.spec.ts` vérifie que `public/sw.js` fonctionne
réellement, sans dépendre d'un backend Supabase/VAPID live (absent de cet
environnement) :

1. le service worker s'enregistre et devient actif ;
2. un push avec payload JSON déclenche `showNotification` avec le bon
   titre/corps/tag/lien (`data.url`) ;
3. un push non-JSON tombe sur le titre par défaut + `event.data.text()` ;
4. un clic sur la notification ouvre/focus la bonne URL.

Ces 4 tests sont déterministes (aucune dépendance réseau externe) et
passent dans cet environnement.

Un 5e test, best-effort, vérifie qu'un `pushManager.subscribe()` réel obtient
un endpoint valide auprès du service de push du navigateur (Chromium →
`fcm.googleapis.com`). Il s'auto-skip proprement (`test.skip`) si la clé
VAPID de test n'est pas fournie (`E2E_VAPID_PUBLIC_KEY`) ou si le service de
push n'est pas joignable — c'est le cas dans cet environnement sandboxé (accès
réseau restreint au proxy de l'agent), pas un bug de code. Pour l'exécuter
en local/CI avec un vrai accès réseau :

```bash
export E2E_VAPID_PUBLIC_KEY=$(node -e "console.log(require('web-push').generateVAPIDKeys().publicKey)")
npm run test:e2e
```

`playwright.config.ts` sert `public/` (le vrai `sw.js` livré en prod) via un
petit serveur statique dédié (`e2e/static-server.mjs`) plutôt que de démarrer
toute l'app — pas besoin de credentials Supabase pour ces tests. La page hôte
(`e2e/fixtures/index.html`) est un harnais de test qui ne fait *pas* partie
des assets publics de prod.

`PLAYWRIGHT_CHROMIUM_PATH` (variable d'env, non commitée dans le comportement
par défaut) permet de pointer vers un Chromium pré-installé dans un
environnement sandboxé qui n'a pas accès à `playwright install` — sans elle,
`npx playwright install` télécharge normalement le navigateur attendu par la
version de `@playwright/test` du projet.
