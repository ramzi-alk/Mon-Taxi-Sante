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

- **`accept_series` n'a pas de migration dans le dépôt — investigué et
  résolu.** Vérifié directement en base (Supabase MCP) : la fonction existe
  bien et fonctionne (elle délègue à `accept_ride()` pour chaque séance, donc
  la détection de chevauchement de la migration 056 s'y applique déjà
  automatiquement). Le SQL avait simplement été perdu du dépôt suite à une
  collision de numérotation (un fichier `037_*.sql` différent a réutilisé ce
  numéro). `update_driver_heartbeat()` était dans le même cas. Les deux sont
  maintenant documentées par un backfill fidèle :
  `058_backfill_accept_series_heartbeat.sql` (appliqué en base).
- **Les deux fonctions backfillées étaient exécutables par `anon`.**
  Découvert via l'advisor sécurité Supabase après application de 058 : Supabase
  accorde `EXECUTE` à `anon`/`authenticated` par défaut sur les fonctions
  créées hors du process de migration standard (même cause que documentée
  dans la migration 011 historique du projet) — un `REVOKE ALL ... FROM
  PUBLIC` ne retire pas ce grant explicite. Non exploitable en pratique
  (`auth.uid()` est `NULL` pour `anon`), mais corrigé par prudence :
  `061_revoke_anon_accept_series_heartbeat.sql` (appliqué en base). Les
  nouvelles fonctions du Sprint 2 (`get_my_driver_performance`,
  `get_my_cancellations`, `cancel_ride_by_driver`) ferment aussi
  explicitement `anon` par précaution.
- **L'upload PMT côté patient était cassé en production — corrigé.**
  `select count(*) from storage.buckets` renvoyait **0** sur le projet
  Supabase réel — aucun bucket n'existait, y compris `pmt-documents` que
  `BookingForm.tsx` utilise pour joindre le fichier de prescription médicale
  de transport. L'upload échouait silencieusement (`storageRepository.uploadFile`
  catch l'erreur et retourne `null`), la réservation continuait sans le
  fichier. Corrigé : bucket privé `pmt-documents` + policies RLS (migration
  `062_pmt_documents_bucket.sql`), colonne `bookings.pmt_file_url` renommée
  en `pmt_file_path` (même raisonnement HDS-sensible que les documents
  chauffeur — stocke un chemin, pas une URL publique), nouvelles fonctions
  génériques `storageRepository.uploadPrivateFile`/`createSignedUrl`.
  **Migration en attente du merge** (même piège que 056/057 : elle touche le
  funnel de réservation patient actif en prod — l'appliquer avant le merge
  casserait l'insertion de toute nouvelle réservation sur `main`, qui insère
  encore avec l'ancien nom de colonne).
- **Deux chemins redondants pour annuler une série.** Le tableau de bord
  (`cancelSeriesMutation` dans `chauffeur.tsx`) boucle sur
  `cancel_ride_by_driver` par course plutôt que d'appeler la RPC dédiée
  `cancel_series` (un seul appel, un seul événement d'annulation suspecte
  pour toute la série — voir migration 038). `bookingsRepository.cancelSeriesRides`
  (qui appelle bien `cancel_series`) semble donc mort côté UI. Toujours pas
  tranché : brancher l'UI sur `cancel_series` (plus juste vis-à-vis du
  chauffeur) ou supprimer le code mort.

### ⚠️ Migrations en attente du merge sur `main`

`056` (chevauchement d'horaires), `057` (motif d'annulation + historique),
`059` (indicateurs de performance, dépend de `057`) et `062` (bucket PMT,
renomme une colonne utilisée par le funnel de réservation patient) sont
**poussées mais pas encore appliquées à la base**, sur décision explicite :
`main` (donc la prod réelle, un seul projet Supabase partagé entre preview
et prod) tourne encore sur l'ancien code — les appliquer maintenant
casserait respectivement `cancel_ride_by_driver` pour les vrais chauffeurs
et l'insertion de toute nouvelle réservation patient, jusqu'au merge.
**À appliquer toutes les quatre ensemble, au moment du merge de cette
branche sur `main`** — pas avant, pas après.

`058`, `060` et `061` sont déjà appliquées (sûres indépendamment du
timing de merge : backfill pur, ou colonnes/bucket jamais référencés par le
code de `main`).

---

## Sprint 2 — Conformité & confiance ✅ Livré (code) — migrations partiellement en attente

- [x] **Centre de documents chauffeur.** `drivers_details` avait déjà
      `cpam_certificate_url`/`driving_licence_url`/`insurance_url` (jamais
      exploitées) — renommées en `*_path` (bucket privé, pas d'URL publique
      stockée) et complétées avec `cpam_certificate_expires_at`/
      `insurance_expires_at`. Bucket Storage privé `driver-documents` créé
      avec policies RLS (chauffeur lit/écrit ses propres fichiers via le
      premier segment du chemin, admin lit tout). URLs générées à la demande
      via `createSignedUrl` (1h), jamais stockées en clair. Voir migration
      `060_driver_documents_center.sql` (appliquée), nouveau composant
      `src/components/driver/DocumentUploadField.tsx` (badge Valide/Expire
      bientôt/Expiré/Déposé), carte "Mes documents" dans `chauffeur_.compte.tsx`.
      Pas encore livré : alertes automatiques avant expiration (prévu une
      fois qu'on aura du recul sur l'usage réel).
- [x] **Détail des annulations suspectes visible chauffeur + admin.**
      Nouvelle table `booking_driver_cancellations` (migration 057, en
      attente du merge — voir ci-dessus) : historique persistant d'une ligne
      par annulation, contrairement à `bookings.cancellation_reason` qui ne
      garde que le dernier motif sur la course (écrasé si un second chauffeur
      accepte puis annule à son tour). Carte "Historique de mes annulations"
      sur `chauffeur_.compte.tsx` (chauffeur), section dans `DriverDetailDialog`
      de `/admin/chauffeurs` (admin, via `adminDriversRepository.fetchDriverCancellations`).
- [x] **Indicateurs de performance personnels.** Nouvelle section "Ma
      performance" sur le tableau de bord : taux d'acceptation (accepté /
      (accepté + refusé), exploite `booking_driver_refusals` déjà existante),
      taux d'annulation (annulé / accepté, exploite la nouvelle table), et
      tendance de note (moyenne des 30 derniers jours vs les 30 jours
      précédents). RPC `get_my_driver_performance()` — migration `059`, en
      attente du merge (dépend de `057`).
- [x] **Écran unique "Préférences de courses".** Le rayon d'acceptation a
      migré de sa section dédiée du tableau de bord vers la barre de filtres
      de `PoolList.tsx`, avec un texte explicite : *"Seul le rayon change les
      courses qui vous sont proposées (et notifiées) — les autres filtres
      ci-dessus n'affectent que cet affichage."* Répond directement à la
      confusion identifiée (rayon serveur vs filtres d'affichage client, deux
      causes différentes à "pourquoi je ne vois pas cette course").

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
pnpm run test:e2e
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
