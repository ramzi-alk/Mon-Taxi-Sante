# Mon Taxi Santé — Roadmap fonctionnalités chauffeur (par sprint)

> Issu de l'analyse produit de l'expérience chauffeur post-connexion (gestion des
> courses, revenus, sécurité, fidélisation), réalisée à la lumière de l'existant
> dans `src/routes/tableau-de-bord/chauffeur.tsx`, `src/components/driver/RideCard.tsx`
> et `src/repositories/bookingsRepository.ts`.
>
> Contexte produit : Mon Taxi Santé est une plateforme de **transport sanitaire
> conventionné** (taxi / VSL / PMR, CPAM, mutuelle, ALD) et non un VTC généraliste.
> Les priorités ci-dessous privilégient donc la fiabilité, la traçabilité médicale
> et la conformité réglementaire plutôt que la gamification ou le surge pricing
> façon Uber/Bolt, peu adaptés à un tarif encadré CPAM.
>
> Organisé en sprints exécutables. Coché = livré dans le code.

---

## État des lieux (avant Sprint 1)

Ce qui existe déjà côté dashboard chauffeur :
- Pool de courses disponibles + onglet "Mes courses", mise à jour temps réel
  (Supabase Realtime sur `bookings`).
- Acceptation de course avec verrou optimiste (`status=eq.available`).
- 4 stats basiques (courses dispo, courses du jour, total terminées, prochaine
  course).
- Modèle de données déjà riche : `vehicle_type` (taxi/vsl/pmr), `trip_type`
  (aller_simple/aller_retour/multiple), besoins (fauteuil/brancard/oxygène),
  `cpam_status`, `mutual_name`.

Ce qui manque structurellement et bloque l'expérience chauffeur réelle :
pas de cycle de vie de course après acceptation, pas de statut en
ligne/hors ligne, pas de navigation intégrée, pas de revenus, pas de
notation, pas de profil/documents chauffeur, pas de bouton d'urgence.

---

## Sprint 1 — Cycle de vie de la course & disponibilité (bloquant) ✅ Livré

Sans ça, le chauffeur ne peut pas réellement piloter sa journée depuis l'app.

- [x] **Transitions de statut de course** : `accepted` → `in_progress` →
      `completed`, avec boutons contextuels sur `RideCard` ("Démarrer la
      course", "Terminer la course"). RPC Supabase dédiées `start_ride` /
      `complete_ride` (sur le modèle de `cancel_booking`/`update_booking`) +
      horodatage (`picked_up_at`, `completed_at`). Voir migration
      `018_driver_ride_lifecycle.sql`.
- [x] **Statut en ligne / pause / hors ligne** du chauffeur, stocké sur la
      table `drivers` (`is_online`). Le pool ne montre des courses qu'aux
      chauffeurs "en ligne" (`driversRepository.ts`, toggle dans
      `tableau-de-bord/chauffeur.tsx`).
- [x] **Navigation intégrée** : bouton "Naviguer" en deep-link vers Google
      Maps à partir de `pickup_lat/lng` et `dropoff_lat/lng` (`RideCard.tsx`).
- [x] **Filtrage du pool par compatibilité véhicule réelle** (fauteuil /
      brancard / oxygène) — `driver_matches_booking()` côté SQL, vérifié à
      nouveau dans `accept_ride` (erreur `vehicle_not_compatible`) pour
      éviter qu'un chauffeur non équipé accepte une course PMR/brancard.

## Correctifs post-Sprint 1

Bugs bloquants découverts et corrigés après la livraison du Sprint 1.

- [x] **Publication automatique des réservations dans le pool** : les
      nouvelles courses restaient bloquées en `pending` indéfiniment — rien
      ne les faisait passer à `available`, le statut filtré par le pool
      chauffeurs (l'étape de confirmation admin prévue n'a jamais été
      construite). RPC `publish_booking()` (`pending` → `available`, scopée
      au patient) appelée juste après l'insertion (voir migration
      `019_publish_booking_to_pool.sql`). Fenêtre d'édition patient
      (`update_booking`/`update_booking_by_reference`) élargie en
      conséquence à `pending` + `available`.
- [x] **Auto-réparation des profils manquants** (`profilesRepository.ensureProfile`) :
      le trigger `handle_new_user` ne crée pas toujours la ligne `profiles`
      correspondante (sessions anonymes patient comme inscriptions
      chauffeur), provoquant une violation de clé étrangère
      `bookings_patient_id_fkey` à la réservation. Appelé avant toute
      insertion dépendant de ce FK, dans `submitBookingServerFn` et
      `submitDriverApplicationServerFn`.
- [x] **Responsive du dashboard chauffeur** : en-tête (toggle disponibilité +
      bouton temps réel) et ligne prix/CTA de `RideCard` empilés en colonne
      sur petit écran au lieu de déborder.

## Sprint 2 — Revenus, notifications & confiance (high impact rétention)

- [ ] **Tableau de revenus** : total jour/semaine/mois, détail par course,
      export CSV/PDF (utile pour la compta et les justificatifs CPAM tiers
      payant).
- [ ] **Notifications push/SMS** : nouvelle course dispo correspondant au
      véhicule du chauffeur, rappel avant un pickup planifié, alerte
      d'annulation patient. Le bouton "Temps réel actif/désactivé" actuel ne
      fait que du live-update de page web ouverte, pas de la vraie notif.
- [ ] **Notation mutuelle chauffeur ↔ patient** après chaque course terminée
      (note + commentaire des deux côtés) — aucune table de rating n'existe
      actuellement.
- [ ] **Bouton SOS / urgence** pendant une course `in_progress` : appel
      direct + partage de position à une cellule support/urgences.
- [ ] **Espace "Mes documents"** : upload carte professionnelle, assurance,
      carte grise, agrément VSL/ambulance (étendre `storageRepository.ts`),
      alertes avant expiration, statut de validation admin.

## Sprint 3 — Confort d'usage & planification (medium impact)

- [ ] **Mode "course en cours" simplifié** : vue plein écran minimaliste
      pendant la conduite (destination, naviguer, terminer, appeler le
      patient) — le dashboard grille actuel n'est pas pensé pour l'usage au
      volant.
- [ ] **Fiche course enrichie** : bouton "Appeler le patient" (`patient_phone`
      déjà disponible), durée d'attente estimée affichée pour les
      allers-retours.
- [ ] **Courses récurrentes en série** : proposer au chauffeur de s'engager
      sur une série complète (dialyse, chimio, kiné) plutôt que course par
      course — revenu prévisible et continuité patient-chauffeur.
- [ ] **Suivi de position partagé** pendant la course, envoyé par SMS/email
      au patient à l'acceptation.
- [ ] **Statistiques de performance personnelles** : ponctualité, taux
      d'acceptation/annulation, distance moyenne à vide entre deux courses.
- [ ] **Prévision de charge basée sur les rendez-vous récurrents** (ex.
      "12 courses dialyse secteur Nord cette semaine, créneaux 7h-9h") —
      pas de surge pricing, juste de la visibilité sur une demande déjà
      connue à l'avance.

## Sprint 4 — Fidélisation, différenciation & innovations

- [ ] **Primes de performance simples** sur critères objectifs (ponctualité,
      faible taux d'annulation, créneaux difficiles acceptés) — éviter la
      gamification agressive façon VTC loisir, inadaptée à un contexte
      médical où la pression au volume est un risque sécurité patient.
- [ ] **Continuité chauffeur-patient** : remonter en priorité au chauffeur
      habituel d'un patient récurrent ("votre chauffeur habituel est
      disponible").
- [ ] **Génération automatique des justificatifs CPAM/mutuelle** depuis la
      fiche course terminée, pour réduire la charge administrative
      chauffeur et patient.
- [ ] **Mode "consultation avec attente"** : le chauffeur indique son retour
      estimé et est notifié quand le patient signale qu'il ressort du
      rendez-vous, pour synchroniser les allers-retours médicaux.
- [ ] **Tableau de bord conformité** regroupant documents, formations et
      alertes réglementaires en un seul endroit.

---

**Note de cohérence avec `ROADMAP.md`** : ce fichier est focalisé sur
l'expérience *chauffeur* post-connexion. Il recoupe partiellement le
Sprint 3 de `ROADMAP.md` ("Monétisation & onboarding chauffeurs" — KYC,
Stripe, tableau de revenus, notifications) et le Sprint 5 ("Suivi temps
réel du chauffeur côté patient") : à fusionner/prioriser ensemble lors de
la planification réelle plutôt que de dupliquer le travail.
