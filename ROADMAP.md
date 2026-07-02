# Mon Taxi Santé — Roadmap d'audit produit (par sprint)

> Issu de l'audit produit critique (UI, UX, Produit & Positionnement, Commercial,
> Marketing & Communication, QA & Fiabilité, Recommandations stratégiques).
> Organisé en sprints exécutables. Coché = livré dans le code.

---

## Sprint 1 — Corrections critiques & "quick wins" ✅ TERMINÉ

Bugs bloquants, contenu trompeur/fabriqué, et incohérences réglementaires à corriger
avant toute mise en avant commerciale du site.

- [x] **Centraliser le numéro de téléphone** dans `src/lib/contact.ts` (était dupliqué
      en dur à 24 endroits, dont un faux numéro `0800 000 000`). Un seul point de
      vérité (`CONTACT_PHONE_DISPLAY`, `CONTACT_PHONE_TEL`, `CONTACT_EMAIL`) propagé
      dans Navbar, Footer, formulaire de réservation, FAQ, pages SEO locales, CGV,
      mentions légales et JSON-LD.
- [x] **Corriger le tunnel de réservation cassé** : `BookingForm.tsx` redirigeait vers
      `/reservation/confirmation`, route inexistante (404 systématique après
      soumission). Route créée avec récapitulatif de réservation (adresse, date,
      statut CPAM) en lecture Supabase.
- [x] **Imposer le consentement RGPD/CGV à la réservation** : la checkbox de l'étape
      10 n'était pas reliée au formulaire (`required` HTML seul, non bloquant avec
      react-hook-form). Ajout du champ `consent` au schéma Zod avec `.refine()`
      bloquant, et `consent_accepted_at` horodaté envoyé à l'insertion.
- [x] **Ajouter la colonne de traçabilité du consentement** : migration SQL
      `002_booking_consent.sql` (`bookings.consent_accepted_at TIMESTAMPTZ`) +
      mise à jour des types `Booking` et `database.types.ts`.
- [x] **Retirer le lien public `/admin` du footer** : l'espace admin était linké
      depuis le footer visible par tout visiteur non authentifié.
- [x] **Supprimer les statistiques fabriquées de la page d'accueil** (`StatsSection`,
      ex. "50 000+ trajets") : aucune source, aucun moyen de les vérifier.
- [x] **Supprimer le composant `Testimonials`** (209 lignes de faux témoignages
      patients avec noms/villes/citations inventés, et l'affirmation fausse
      "Tous les témoignages sont vérifiés et associés à une réservation réelle").
- [x] **Supprimer les fausses notes/avis sur les pages SEO locales**
      (`$department.$city.tsx`) : étoiles factices + `aggregateRating` JSON-LD
      avec une note et un nombre d'avis calculés à partir de la longueur du nom
      de ville (donc totalement inventés, et risqué en SEO car détectable comme
      structured data trompeuse par Google).
- [x] **Corriger le bug de taux de remboursement CPAM** dans `pricing.ts` (le taux
      "standard" et les statuts ALD/CMU/CSS n'étaient pas appliqués correctement
      au calcul final). *Note : `calculateCpamPrice` n'est pour l'instant appelé
      par aucun écran (aucune donnée de distance réelle disponible) — correction
      faite par anticipation du branchement en Sprint 2.*
- [x] **Adoucir la mention "Reconnu par"** dans `TrustBadges.tsx` qui listait
      `Assurance Maladie / ARS / HDS` comme des organismes de reconnaissance
      officielle non vérifiable (notamment "ARS", qui n'a aucun rôle
      d'homologation d'une plateforme privée). Remplacé par un bandeau
      "Conformité" neutre, factuel.

**Vérification effectuée** : `npm install`, `npx vite build` (succès complet,
client + SSR, route `/reservation/confirmation` générée automatiquement dans
`routeTree.gen.ts`), grep de confirmation qu'aucune occurrence de l'ancien
numéro ou des anciens textes ne subsiste.

**Dette technique notée (hors scope Sprint 1)** : `npx tsc --noEmit` révèle
~20 erreurs de typage, toutes pré-existantes et systémiques (le client Supabase
typé résout les résultats de requêtes en `never` sur `admin.tsx`, `connexion.tsx`,
`chauffeur.tsx`, `chauffeurs/inscription.tsx`, l'insertion pré-existante dans
`BookingForm.tsx`, et par héritage la nouvelle page de confirmation). Le projet
n'a pas de script `typecheck` et `vite build` ne fait pas de vérification de
types — ce n'est donc pas bloquant, mais à traiter en Sprint 4 (voir plus bas).

---

## Sprint 2 — Tarification réelle & fiabilité du parcours de réservation

- [ ] Intégrer un service de géocodage (Google Maps Distance Matrix ou équivalent)
      pour calculer `distance_km` réellement entre `pickup_address` et
      `dropoff_address`, au lieu de laisser le champ vide/non renseigné.
- [ ] Brancher `calculateCpamPrice()` dans le formulaire de réservation pour
      afficher une estimation de prix réelle avant soumission (actuellement le
      patient n'a aucune idée du coût ni du reste à charge avant validation).
- [ ] Afficher clairement la décomposition reste-à-charge / part CPAM sur le
      récapitulatif et sur la page de confirmation.
- [ ] Gérer les cas d'erreur de géocodage (adresse introuvable, hors zone de
      couverture) avec un message actionnable plutôt qu'un échec silencieux.
- [ ] Ajouter un système de notification (email/SMS) de confirmation de
      réservation au patient — actuellement rien n'est envoyé après soumission.
- [ ] Mettre en place l'attribution réelle d'un chauffeur (`driver_id`) — le
      statut `available` semble correspondre à des courses non assignées sans
      mécanisme de matching visible.

## Sprint 3 — Monétisation & onboarding chauffeurs

- [ ] Intégrer Stripe (ou équivalent) pour la facturation des abonnements
      chauffeurs (`subscription_status` existe en base mais rien ne le fait
      transiter de `trial` à `active`/`past_due`).
- [ ] Construire le flux de vérification KYC chauffeur : upload de la carte
      professionnelle, conventionnement CPAM, assurance, carte grise — avec
      stockage Supabase Storage et validation manuelle admin avant
      `approved_at`.
- [ ] Ajouter un tableau de bord de revenus/courses pour les chauffeurs.
- [ ] Notifier les chauffeurs (email/push) des nouvelles courses disponibles
      dans leur zone.

## Sprint 4 — Qualité, tests & dette technique

- [ ] Résoudre la cause racine des erreurs de typage Supabase (`never` sur les
      résultats de requêtes) — probablement un souci de génération du fichier
      `database.types.ts` à la main plutôt que via `supabase gen types
      typescript`, ou un défaut de configuration TS strict mode/lib. Lancer
      une vraie génération de types contre le schéma réel.
- [ ] Ajouter un script `typecheck` au `package.json` et l'intégrer en CI.
- [ ] Ajouter une suite de tests (au minimum : `pricing.ts`, validations Zod du
      formulaire de réservation, garde RLS Supabase critiques).
- [ ] Mettre en place une CI (lint + typecheck + build + tests) sur chaque PR.
- [ ] Auditer systématiquement le contenu des pages SEO locales générées
      (`$department.$city.tsx`) pour s'assurer qu'aucune autre donnée
      fabriquée ou non vérifiable n'y subsiste (ex. listes d'hôpitaux/cliniques
      à proximité — vérifier l'exactitude des données utilisées).
- [ ] Revue légale RGPD/HDS complète (politique de confidentialité, sous-
      traitants, durées de conservation des données médicales).

## Sprint 5 — Scalabilité & dépendances

- [ ] Migrer hors des versions alpha de `@tanstack/react-router` /
      `@tanstack/react-start` vers des versions stables dès qu'elles existent
      (risque de rupture en production sur un framework non stabilisé).
- [ ] Suivi en temps réel du chauffeur (position GPS) pour le patient pendant
      la course.
- [ ] Explorer des flux de revenus B2B (établissements de santé, EHPAD,
      cliniques) en plus du flux B2C direct.
- [ ] Revue de charge / scalabilité de l'infrastructure Supabase à mesure que
      le volume de réservations augmente.

---

# Panel admin — Audit & feuille de route (juillet 2026)

> Issu de l'audit dédié du panel admin (`src/routes/admin.tsx`) : accès &
> sécurité, fonctionnalités clés, UX/workflows, KPIs, fiabilité. Continue la
> numérotation des sprints ci-dessus plutôt que d'en redémarrer une nouvelle.
> Priorités héritées de l'audit : `High` > `Medium` > `Low`.

## Sprint 6 — Sécurité des fondations & fiabilité de l'existant ✅ TERMINÉ

Objectif : durcir l'accès admin et corriger les points de fiabilité du flux
d'approbation chauffeur, sans attendre la refonte de navigation (Sprint 7).

- [x] **Allowlist `ADMIN_EMAILS` en défense en profondeur** (`High`) —
      `src/lib/adminAccess.ts` (parsing, insensible à la casse) +
      `src/server/adminAccess.ts` (`checkAdminAccessServerFn`, qui re-vérifie
      le token côté serveur via `auth.getUser`, relit `profiles.role` avec le
      client service-role, puis vérifie l'email dans l'allowlist). Branché sur
      `src/routes/admin.tsx` à la place de la simple lecture RLS côté client.
      `.env.example` documenté : si `ADMIN_EMAILS` est absent, seul le rôle DB
      est vérifié (comportement historique inchangé, pas de risque de
      lockout accidentel).
- [x] **Refus motivé des candidatures chauffeur** (`High`) — migration
      `042_driver_application_rejection.sql` (colonnes `rejected_at`,
      `rejected_by`, `rejection_reason` sur `drivers_details`, appliquée sur
      le projet Supabase `Mon-Taxi-Sante`) + `driversRepository.rejectDriver`
      + filtre `fetchPendingDrivers` sur `rejected_at IS NULL` + email
      `driverRejectedEmail` (motif inclus) + `notifyDriverRejectedServerFn`.
      Bouton "Refuser" avec motif obligatoire ajouté à côté d'"Approuver".
- [x] **Confirmation avant actions à impact** (`Medium`) — composant
      `src/components/ui/alert-dialog.tsx` (Radix `@radix-ui/react-alert-dialog`,
      jusque-là en dépendance mais jamais utilisé). Dialogue de confirmation
      sur "Approuver" et sur "Refuser" (avec le champ motif).
- [x] **Fiabilité de l'approbation/refus chauffeur** (`High`) —
      `notifyDriverApproved`/`notifyDriverRejected` retournent désormais un
      booléen de succès d'envoi au lieu d'avaler l'échec silencieusement (le
      principe best-effort "ne jamais lever d'exception" du fichier est
      conservé). Toast "Chauffeur approuvé"/"Candidature refusée" (succès DB)
      distinct du toast "Email non envoyé" (échec Resend) — l'admin ne
      confond plus les deux. États `isError` + bouton "Réessayer" ajoutés sur
      les candidatures et les statistiques (au lieu d'un tableau vide
      indiscernable d'un "aucune donnée").
- [x] **Comptage de statuts scalable** (`Medium`) — RPC Postgres
      `get_booking_status_counts()` (`GROUP BY` côté base, migration 042) ;
      `bookingsRepository.fetchBookingStatusCounts` appelle la RPC au lieu de
      rapatrier toute la table `bookings` côté client.

**Fichiers touchés** : `supabase/migrations/042_driver_application_rejection.sql`
(nouveau), `src/lib/database.types.ts` (régénéré depuis le schéma live),
`src/lib/adminAccess.ts` (nouveau), `src/server/adminAccess.ts` (nouveau),
`src/components/ui/alert-dialog.tsx` (nouveau), `src/routes/admin.tsx`
(réécrit), `src/repositories/driversRepository.ts`,
`src/repositories/bookingsRepository.ts`, `src/server/email.ts`,
`src/server/emailTemplates.ts`, `.env.example`.

**Vérification effectuée** : migration appliquée et vérifiée sur le projet
Supabase live (`list_tables`/`list_migrations` après coup), types
régénérés (`generate_typescript_types`), `npm install` + `npx tsc --noEmit`
(aucune nouvelle erreur — les 2 erreurs `ImportMeta.env` restantes dans
`emailTemplates.ts` sont pré-existantes, confirmées identiques sur la
branche avant ce sprint) + `npx vite build` (succès complet, client + SSR).

**Action requise côté opérateur** : définir `ADMIN_EMAILS` dans les
variables d'environnement Vercel pour activer la seconde barrière (sans
cette variable, le comportement reste celui d'avant ce sprint).

**Constat annexe (hors périmètre, à traiter séparément)** : les Supabase
advisors signalent RLS désactivée sur `public.booking_reminder_tokens`.
Non introduit par ce sprint ; la table n'est en principe touchée que par
des fonctions `SECURITY DEFINER`, mais reste en l'état interrogeable
directement avec la clé anon. Remédiation proposée (non appliquée) :
`ALTER TABLE public.booking_reminder_tokens ENABLE ROW LEVEL SECURITY;` —
à accompagner d'une policy explicite avant activation pour ne pas casser
le flux de rappel de course.

## Sprint 7 — Navigation & gestion des réservations

- [ ] **Navigation en sidebar par domaine** (`High`) — layout app-shell,
      sous-routes `/admin/reservations`, `/admin/chauffeurs`, `/admin/avis`,
      `/admin/reglages`.
- [ ] **Gestion complète des réservations** (`High`) — table paginée
      (statut, véhicule, date, PMR/brancard/oxygène), recherche par
      référence/téléphone/patient, vue détail, actions "réassigner",
      "annuler avec motif", "marquer urgent".
- [ ] **Recherche globale Cmd+K** (`High`) — palette de commande
      (course/chauffeur/patient) accessible depuis tout `/admin/*`.
- [ ] **File d'attente & alerte SLA** (`High`) — vue "à risque" (courses
      `available` non attribuées à moins de N heures du départ) + alerte
      automatique à l'équipe ops.
- [ ] **Mises à jour en temps réel** (`Medium`) — abonnement Supabase
      Realtime sur `bookings`/`drivers_details`, invalidation React Query.

## Sprint 8 — Chauffeurs, modération & qualité

- [ ] **Répertoire chauffeurs complet** (`High`) — liste (actifs/suspendus/
      en attente), fiche détail (stats, note moyenne, historique), actions
      "suspendre"/"réactiver"/"exiger un document".
- [ ] **Actions groupées (bulk)** (`Medium`) — sélection multiple
      (`Checkbox` shadcn) + action groupée "approuver".
- [ ] **Modération des avis mutuels** (`Medium`) — vue des derniers avis
      filtrable par note basse, action "masquer le commentaire".
- [ ] **Recherche & fiche patient** (`Medium`) — recherche nom/téléphone/
      email, fiche récapitulative (historique, notes, statut CPAM).
- [ ] **Détection de signaux faibles** (`Medium`) — vue agrégeant
      suspensions chauffeur, notes basses, annulations tardives.
- [ ] **Tables responsives mobile** (`Low`) — bascule tableau → cartes
      empilées sous le breakpoint `sm`.

## Sprint 9 — Sécurité avancée & gouvernance

- [ ] **Rôles graduels (support/admin/super_admin)** (`High`) — extension
      de l'enum `user_role` + matrice de permissions remplaçant le simple
      `is_admin()` booléen dans les policies RLS sensibles.
- [ ] **2FA obligatoire pour tout compte admin** (`High`) — Supabase Auth
      MFA (TOTP), enrôlement/challenge forcé avant `/admin`.
- [ ] **Journal des connexions & des actions admin** (`Medium`) — table
      `admin_activity_log` (acteur, action, cible, avant/après, IP,
      timestamp), triggers + logging serveur, vue dédiée filtrable.
- [ ] **Route de connexion admin dédiée** (`Medium`) — `/admin/connexion`
      séparée de `/connexion`, Turnstile systématique, rate limit renforcé.

## Sprint 10 — Pilotage & productivité

- [ ] **KPIs opérationnels avancés** (`Medium`) — taux d'annulation, délai
      moyen d'attribution, taux de courses sans chauffeur, note moyenne,
      répartition géographique, fenêtres 7/30 jours + tendance (vues SQL
      matérialisées).
- [ ] **Export de données comptabilité/CPAM** (`Medium`) — export CSV des
      courses terminées (tarif CPAM 2025, distance, statut mutuelle).
- [ ] **Centre de notifications internes** (`Low`) — flux in-app (Supabase
      Realtime), statut lu/traité, en complément des emails existants.

## Backlog panel admin — Idées bonus / différenciation (non planifié)

- Assignation prédictive du chauffeur (scoring distance/équipement/note/charge du jour)
- Alertes SLA automatiques par SMS/Slack interne
- Suivi de conformité chauffeur (expiration SIRET, assurance, carte VTC/taxi)
- NPS patient post-course agrégé par zone/chauffeur
- Facturation CPAM assistée (génération de justificatifs depuis `cpam_status` + tarif 2025)
- Mode astreinte (vue mobile allégée, push ciblées)
