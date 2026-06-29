# Audit UX/UI — Espace Chauffeur · Mon Taxi Santé

> Analyse réalisée le 2026-06-29 — Référence : leaders du marché (Uber, Bolt, G7, Free Now)

## Contexte produit

Application de **transport sanitaire conventionné** (taxi, VSL, ambulance). Les chauffeurs opèrent sur une **webapp responsive** (pas une app native). Flux principal : connexion → dashboard → pool de courses → acceptation → démarrage → fin → notation.

---

## Inventaire des écrans

| Écran | Route | Rôle |
|---|---|---|
| Dashboard principal | `/tableau-de-bord/chauffeur` | Pool + mes courses + stats + disponibilité |
| Mon compte | `/tableau-de-bord/chauffeur/compte` | Profil, véhicule, stationnement, abonnement |
| Inscription | `/chauffeurs/inscription` | Onboarding initial |
| Tarifs | `/chauffeurs/tarifs` | Information grille tarifaire |

---

## Problèmes identifiés & recommandations

### 🔴 HIGH IMPACT

#### 1. Pas de notification push — le chauffeur doit garder l'onglet ouvert
**Problème** : Le temps réel repose sur Supabase Realtime via WebSocket. Si le chauffeur minimise l'onglet ou éteint l'écran, il rate les nouvelles courses. La bannière "Gardez cette page ouverte" le confirme explicitement.  
**Solution** : Web Push Notifications (Service Worker + Push API). À l'activation du statut "En ligne", demander la permission. Déclencher une push server-side via Edge Function Supabase à chaque nouvelle course disponible. Notification avec son, vibration + deeplink vers la course.  
**Impact** : Augmentation du taux d'acceptation, réduction de la latence acceptation.

#### 2. Statut de disponibilité non persisté entre sessions (heartbeat manquant)
**Problème** : Un chauffeur qui oublie de passer offline restera "En ligne" dans le pool jusqu'à sa prochaine connexion. Fausse disponibilité pour les opérateurs.  
**Solution** : Champ `last_heartbeat_at` mis à jour toutes les 30s. Cron qui marque offline les chauffeurs dont le heartbeat dépasse 5 min. Beacon API sur `beforeunload` pour un passage offline immédiat.  
**Impact** : Fiabilité du pool, crédibilité de la plateforme.

#### 3. `alert()` natif pour toutes les erreurs — UX catastrophique sur mobile ✅ Sprint 1
**Problème** : 8 occurrences de `alert(\`Erreur : ...\`)` dans `chauffeur.tsx`. Sur mobile, `alert()` bloque le fil principal et est visuellement rupturiste.  
**Solution** : Remplacer par le composant `Toast` déjà disponible (`~/components/ui/toast.tsx`). Toasts destructifs en rouge pour les erreurs, verts pour les succès.  
**Impact** : Expérience fluide, pas d'interruption en conduite.

#### 4. Aucune notification sonore/vibration sur nouvelle course ✅ Sprint 1
**Problème** : Le pool se rafraîchit en temps réel mais aucun son ni vibration n'alerte le chauffeur. Les yeux sont sur la route.  
**Solution** : `new Audio('/sounds/new-ride.mp3').play()` + `navigator.vibrate([200, 100, 200])` quand `poolRides.length` augmente et que le statut est "online". Toggle "Son activé" dans les paramètres.  
**Impact** : Taux d'acceptation, réactivité chauffeur.

#### 5. Rayon d'acceptation : champ texte avec bouton "Enregistrer" — friction max
**Problème** : 3 étapes (clic, frappe, bouton) pour changer un rayon. Chez Bolt, c'est un slider visuel.  
**Solution** : Slider avec valeurs prédéfinies (5 / 10 / 25 / 50 km / Illimité) + sauvegarde automatique au relâchement (debounce 800ms). Mini-carte Mapbox optionnelle.  
**Impact** : Réduction du temps de configuration, meilleure compréhension de l'impact.

---

### 🟠 MEDIUM IMPACT

#### 6. Stats du dashboard sans périodicité
**Problème** : Pas de comparaison semaine/mois, pas de tendance, "Gains totaux" all-time inutile sans contexte.  
**Solution** : Sélecteur de période (Aujourd'hui / Semaine / Mois) + indicateur tendance "↑ 12% vs semaine dernière".  
**Impact** : Motivation chauffeur, visibilité revenus → rétention.

#### 7. Pas de vue planning (groupement par date)
**Problème** : "Mes courses" mélange toutes les courses sans distinction temporelle.  
**Solution** : Grouper par date (Aujourd'hui / Demain / Cette semaine / Plus tard) + indicateur "3 courses demain, ~87 km estimés".  
**Impact** : Organisation, moins d'oublis.

#### 8. Bouton "Terminer la course" sans protection contre les clics accidentels
**Problème** : `onComplete` est un bouton simple. Asymétrie avec l'annulation qui a une double confirmation.  
**Solution** : Confirmation slide (glisser vers la droite) ou dialog de confirmation. Haptic feedback.  
**Impact** : Réduction des erreurs de manipulation.

#### 9. Prix estimé absent de la vue compacte ✅ Sprint 1
**Problème** : `PoolRideRow` n'affiche pas `estimated_price` malgré le champ disponible. Le chauffeur ne peut pas arbitrer sans basculer en vue Cartes.  
**Solution** : Ajouter `~XX,XX €` avant le bouton Accepter dans la ligne compacte.  
**Impact** : Meilleure prise de décision, optimisation des revenus.

#### 10. Aucun countdown pour les courses urgentes ✅ Sprint 1
**Problème** : `isUrgent` change la couleur mais ne montre pas le temps restant exact.  
**Solution** : Countdown "Dans 23 min" rafraîchi chaque minute, rouge pulsant sous 20 min.  
**Impact** : Réduction des courses manquées, meilleure ponctualité.

#### 11. Navigation GPS : popover à 3 choix — 1 tap inutile ✅ Sprint 1
**Problème** : Le chauffeur choisit son GPS à chaque navigation. Sur mobile, il veut naviguer immédiatement.  
**Solution** : Détecter la plateforme (iOS → Apple Plans / Waze, Android → Google Maps / Waze) et lancer directement. Garder le choix manuel en appui long ou icône secondaire.  
**Impact** : -1 tap sur chaque navigation, critical path plus rapide.

#### 12. Notation post-course sans contexte patient
**Problème** : Le `RatingForm` s'affiche sans rappel du nom, du trajet ni de la date. Pas de tags rapides.  
**Solution** : En-tête avec nom + trajet + date. Tags rapides (Ponctuel / Coopératif / Difficile). Bouton "Passer". Délai de 2h.  
**Impact** : Qualité des données, expérience post-course moins stressante.

#### 13. Gestion des séries de courses incomplète
**Problème** : "Séance 3/8" affiché passivement. Pas de bouton "Accepter toute la série", pas d'aperçu du planning.  
**Solution** : Drawer avec planning de la série. Bouton "Accepter toutes les séances" (avec confirmation).  
**Impact** : Revenu prévisible, rétention chauffeur.

---

### 🟡 LOW IMPACT

#### 14. Toggle "Temps réel actif" exposé inutilement dans le header
**Solution** : Déplacer dans Paramètres ou supprimer.

#### 15. Page de suspension sans CTA support
**Solution** : Ajouter lien support + explication de la politique d'annulation.

#### 16. Pas de skeleton UI (spinner plein page)
**Solution** : Composants `SkeletonStatCard` + `SkeletonRideCard` avec `animate-pulse`.

#### 17. Chargement de la page compte tout-ou-rien
**Solution** : Chaque card gère son propre état de loading indépendamment.

#### 18. Focus visible insuffisant sur le toggle de disponibilité
**Solution** : Ajouter `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2`.

#### 19. Pas de mode sombre
**Solution** : Variants `dark:` Tailwind + `prefers-color-scheme`.

#### 20. Pas d'indicateur de connectivité réseau
**Solution** : `navigator.onLine` + événement `offline` → bandeau rouge "Connexion perdue".

---

## Tableau de priorisation global

| # | Recommandation | Impact | Effort | Sprint |
|---|---|---|---|---|
| 4 | Son + vibration nouvelle course | 🔴 High | Faible | **S1** |
| 3 | Remplacer `alert()` par Toast | 🔴 High | Faible | **S1** |
| 9 | Prix estimé en vue compacte | 🟠 Medium | Très faible | **S1** |
| 10 | Countdown urgence | 🟠 Medium | Faible | **S1** |
| 11 | Navigation GPS directe | 🟠 Medium | Faible | **S1** |
| 5 | Slider rayon d'acceptation | 🟠 Medium | Moyen | S2 |
| 6 | Stats avec périodicité + tendances | 🟠 Medium | Moyen | S2 |
| 7 | Planning groupé par date | 🟠 Medium | Faible | S2 |
| 8 | Protection "Terminer course" | 🟠 Medium | Moyen | S2 |
| 1 | Push Notifications | 🔴 High | Élevé | S3 |
| 2 | Heartbeat / offline automatique | 🔴 High | Moyen | S3 |
| 13 | Gestion séries — Accepter tout | 🟠 Medium | Élevé | S3 |
| 12 | Notation contextualisée | 🟡 Low | Moyen | S4 |
| 16 | Skeleton UI | 🟡 Low | Faible | S4 |
| 20 | Indicateur hors ligne | 🟡 Low | Faible | S4 |
| 14 | Toggle temps réel → Paramètres | 🟡 Low | Très faible | S4 |
| 15 | Page suspension → CTA support | 🟡 Low | Très faible | S4 |
| 17 | Loading progressif page compte | 🟡 Low | Faible | S4 |
| 18 | Focus visible disponibilité | 🟡 Low | Très faible | S4 |
| 19 | Mode sombre | 🟡 Low | Élevé | Backlog |

---

## Sprint 1 — Implémenté

- [x] **#3** Remplacer `alert()` par Toast dans `chauffeur.tsx`
- [x] **#4** Son + vibration sur nouvelle course dans le pool
- [x] **#9** Prix estimé dans la vue compacte `PoolRideRow`
- [x] **#10** Countdown d'urgence (minutes restantes) dans `PoolRideRow`
- [x] **#11** Navigation GPS directe selon plateforme (iOS / Android / Desktop)

## Sprint 2 — À planifier

- [ ] **#5** Slider rayon d'acceptation avec debounce
- [ ] **#6** Sélecteur de période sur les stats
- [ ] **#7** Groupement des courses par date dans "Mes courses"
- [ ] **#8** Confirmation slide "Terminer la course"

## Sprint 3 — À planifier

- [ ] **#1** Web Push Notifications (Service Worker)
- [ ] **#2** Heartbeat + auto-offline
- [ ] **#13** Gestion complète des séries

## Sprint 4 — À planifier

- [ ] **#12** Notation post-course contextualisée
- [ ] **#16** Skeleton UI
- [ ] **#20** Indicateur hors ligne
- [ ] **#14** Toggle temps réel → Paramètres
- [ ] **#15** Page suspension → CTA support
- [ ] **#17** Loading progressif page compte
- [ ] **#18** Focus visible disponibilité

## Backlog

- [ ] **#19** Mode sombre
