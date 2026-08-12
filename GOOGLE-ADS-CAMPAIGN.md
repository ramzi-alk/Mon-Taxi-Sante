# Docteur Taxi — Campagne Google Ads Search

> Plan de campagne Google Ads (recherche, "SEA") pour docteurtaxi.fr, à distinguer du
> travail SEO organique déjà en place (voir `ROADMAP-SEO.md`). Les deux se
> complètent : les pages ville/hôpital/ALD construites pour le SEO sont
> réutilisées ici comme pages de destination et comme base d'un ciblage
> Dynamic Search Ads.

## 1. Structure du compte — 5 campagnes

| # | Campagne | Rôle | Budget indicatif | Destinations |
|---|----------|------|-------------------|--------------|
| A | Marque | Défendre "Docteur Taxi" / docteurtaxi.fr | 5% | `/` |
| B | Générique national | Cœur de campagne : taxi conventionné, VSL | 40% | `/`, `/tarifs-cpam`, `/reservation` |
| C | Pathologies ALD | Intention forte par pathologie | 25% | `/maladies/$ald` |
| D | Local — grandes villes | SKAG sur les ~40 plus grandes villes (`top-communes.json`) | 20% | `/$department/$city` |
| E | DSA — longue traîne | Dynamic Search Ads sur le sitemap (11 771 pages) | 10% | toutes pages indexées |

**Pourquoi DSA pour la campagne E** : le site génère déjà 5 509 pages ville +
6 116 pages hôpital + 30 pages ALD, chacune avec du contenu réellement
différencié (rang de population, villes voisines, établissements proches —
Sprint 5 de `ROADMAP-SEO.md`). Créer un groupe d'annonces manuel par page
n'est pas soutenable ; DSA lit le sitemap et génère les annonces à la volée.
Démarrer en ciblage par catégorie d'URL (`/hopitaux/`, `/maladies/`, ou un
département) plutôt que "toutes les pages du site", pour exclure d'office
les routes admin/compte.

## 2. Annonce prête à coller — groupe "Taxi conventionné, générique"

**URL finale** : `https://www.docteurtaxi.fr/reservation`
**Chemin à afficher** : `reservation` (second champ laissé vide) → `www.docteurtaxi.fr/reservation`

Le chemin affiché dans Google Ads est purement cosmétique — il n'est pas
cliquable et n'a pas besoin de correspondre à un dossier réel du site. Ici il
correspond quand même à un vrai segment de route (`src/routes/reservation/index.tsx`)
plutôt qu'un chemin inventé, pour rester cohérent avec le reste du site.

### Titres (15, ≤30 caractères)

1. Taxi Conventionné CPAM (23)
2. 0€ Avance de Frais (18)
3. Remboursé 100% ALD (18)
4. Réservation en Ligne 24/7 (25)
5. Chauffeurs Agréés CPAM (22)
6. Tiers-Payant Intégral (21)
7. Taxi Médical Partout en France (30)
8. VSL & Taxi Assis PMR (20)
9. Dialyse, Chimio, Radio (22)
10. Sans Avance de Frais (20)
11. Réservez en 5 Minutes (21)
12. Docteur Taxi Officiel (21)
13. Prescription Médicale ? (23)
14. Annulation Gratuite 24h (23)
15. Transport Médical CPAM (22)

Épingler le titre 1 en position 1, laisser Google combiner librement les 14 autres.

### Descriptions (4, ≤90 caractères)

1. Taxi conventionné agréé Assurance Maladie. Zéro avance de frais en ALD, maternité, CMU-C. (89)
2. Réservez en ligne en 5 minutes. Chauffeur certifié CPAM, ponctuel, jusqu'à l'hôpital. (86)
3. 100% remboursé en ALD, maternité, CMU-C. 65% pour un assuré standard. Sans surprise. (84)
4. Dialyse, chimio, radiothérapie, PMR : nous vous emmenons partout en France. (76)

**Point de conformité** : ne jamais généraliser "100% remboursé" à tous les
cas — le site distingue lui-même ALD/maternité/CMU-C-CSS (100%) d'un assuré
standard (65%, voir `/tarifs-cpam`). Vérifier aussi les politiques Google Ads
"Santé et médicaments" avant diffusion (les mots "chimiothérapie"/"cancer"
peuvent déclencher une revue automatique).

## 3. Extensions

**Liens annexes (6)** :

| Titre | Destination |
|---|---|
| Tarifs CPAM 2025 | `/tarifs-cpam` |
| Comment ça marche | `/comment-ca-marche` |
| Villes desservies | `/villes` |
| Questions fréquentes | `/faq` |
| Réserver maintenant | `/reservation` |
| Chauffeur partenaire ? | `/chauffeurs/inscription` |

Le dernier lien cible un public différent (recrutement) — le sortir en
campagne séparée s'il dilue le message patient.

**Accroches** : Zéro avance de frais · Chauffeurs agréés CPAM · Disponible
7j/7 · Annulation gratuite 24h avant · Confirmation immédiate · Couverture
France entière · Réservation en 5 minutes

**Extrait de site structuré** — Services : Taxi conventionné, VSL, Véhicule
PMR, Transport longue distance

**Extension d'appel** : `06 02 12 19 07`, suivi des appels activé. Si le
standard n'est pas ouvert 24/7, poser un calendrier de diffusion sur les
horaires réels ; `/reservation` reste disponible en continu.

**Extension de prix : volontairement écartée.** Le tarif/km varie de 1,07€ à
1,27€ selon le département et une majoration de +50% s'applique la
nuit/week-end (`/tarifs-cpam`) — un prix fixe affiché serait trompeur.

## 4. Mots-clés

### Campagne B — Générique national

| Groupe d'annonces | Mots-clés | Correspondance | Destination |
|---|---|---|---|
| Taxi conventionné | taxi conventionné · taxi conventionné assurance maladie · taxi conventionné cpam · transport assis professionnalisé | Expression / Exact | `/` |
| VSL / transport médical | vsl taxi · véhicule sanitaire léger · transport médical remboursé | Expression | `/` |
| Réservation — forte intention | réserver taxi médical en ligne · réserver taxi conventionné · taxi conventionné hôpital | Exact / Expression | `/reservation` |
| Tarifs / prescription | tarif taxi conventionné cpam · prescription médicale de transport · taxi remboursé sécurité sociale prix | Expression / Large | `/tarifs-cpam` |

### Campagne C — Pathologies ALD

| Groupe d'annonces | Mots-clés | Destination |
|---|---|---|
| Dialyse | taxi dialyse · transport dialyse remboursé | `/maladies/nephropathie-chronique-grave-syndrome-nephrotique` |
| Chimio / radiothérapie | taxi chimiothérapie · transport radiothérapie remboursé | `/maladies/tumeur-maligne-cancer` |
| Psychiatrie | transport soins psychiatriques taxi | `/maladies/affections-psychiatriques-longue-duree` |
| Maternité | taxi conventionné maternité | `/` (bloc Maternité) |
| PMR / rééducation | taxi pmr fauteuil roulant · véhicule adapté handicap taxi | `/blog/transport-pmr-personnes-agees` |

### Campagne D — Local (modèle à dupliquer par ville)

Générer une ligne par ville depuis `src/data/seo/top-communes.json` (30
entrées, déjà triées par population) :

- `taxi conventionné [ville]` (Exact) → `/$department/$city`
- `transport médical [ville]` (Expression) → `/$department/$city`
- `taxi cpam [hôpital]` (Expression) → `/hopitaux/$slug`

## 5. Mots-clés négatifs (niveau compte)

- **Intention non médicale** : uber, bolt, blablacar, vtc, chauffeur privé, aéroport, gare, soirée, mariage, location voiture
- **Emploi / recrutement** (sauf campagne dédiée) : emploi, recrutement, offre d'emploi, salaire, devenir chauffeur, formation taxi
- **Gratuité mal comprise** : gratuit, sans ordonnance, covoiturage, bénévole, association transport gratuit
- **Réputation/support — à surveiller, pas forcément à exclure** : avis, arnaque, réclamation (un chercheur d'"avis Docteur Taxi" est souvent un prospect en vérification)

## 6. Ciblage, enchères, budget

- **Zone** : France entière (exclure les IP hors France plutôt que restreindre par région)
- **Langue** : Français
- **Réseaux** : Recherche uniquement au lancement (décocher Display et partenaires de recherche)
- **Appareils** : pas d'exclusion au départ ; tester un ajustement mobile après 2-3 semaines (le tunnel de réservation n'a pas encore été testé sur mobile en conditions réelles, Sprint 2 de `ROADMAP.md`)
- **Audiences** : RLSA sur visiteurs de `/reservation` n'ayant pas atteint `/reservation/confirmation`, en observation d'abord

**Phasage des enchères** : Maximiser les clics (semaines 1-4, le temps
d'accumuler des conversions propres) → Maximiser les conversions (dès ~30
conversions/mois) → CPA cible (après 6-8 semaines d'historique stable,
campagne par campagne).

## 7. Suivi de conversion

| Conversion | Déclencheur | Statut dans le code |
|---|---|---|
| Réservation soumise | Chargement de `/reservation/confirmation` | Route existante (`src/routes/reservation/confirmation.tsx`) — poser le tag de conversion sur cette page |
| Appel initié | Clic sur `tel:+33602121907` | Lien déjà présent partout via `CONTACT_PHONE_TEL` — activer le suivi des clics d'appel |

Recommandation : poser le tag de conversion en événement de page sur la
route de confirmation plutôt que dans le callback de soumission de
`BookingForm.tsx`, pour éviter un double comptage si l'utilisateur retente
une soumission après une erreur réseau.

## 8. Plan d'optimisation continue

- **Semaine 1-2** : valider en conditions réelles le déclenchement unique de
  la conversion "Réservation soumise", suivre le CTR par mot-clé, ajouter aux
  négatifs tout terme hors-sujet remonté dans le rapport de termes de
  recherche.
- **Semaine 3-4** : couper les mots-clés/annonces sous-performants ;
  promouvoir en groupe d'annonces dédié toute ville de la campagne D qui
  convertit particulièrement bien.
- **Mensuel** : recouper avec le trafic organique (Search Console, une fois
  `sitemap.xml` soumis — Sprint 6 de `ROADMAP-SEO.md`) pour repérer quelles
  villes/ALD méritent de sortir de DSA vers un ciblage manuel.
- **En continu** : même discipline éditoriale que le reste du site — aucune
  statistique ou avis fabriqués (Sprint 1 de `ROADMAP.md`), chaque promesse
  d'annonce vérifiable sur la page de destination.
