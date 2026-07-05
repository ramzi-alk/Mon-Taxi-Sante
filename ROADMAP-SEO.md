# Mon Taxi Santé — Roadmap SEO programmatique (par sprint)

> Objectif : générer automatiquement des pages pertinentes pour les communes,
> les hôpitaux et les maladies (ALD) desservis, sans tomber dans le piège du
> contenu fin/dupliqué (pénalisant pour le SEO). Organisé en sprints
> exécutables. Coché = livré dans le code.

---

## Sprint 1 — Pipeline de données ✅ TERMINÉ

- [x] **Données de référence statiques** (`src/data/seo/`) : `regions.json`
      (18 régions), `departments.json` (101 départements avec slug calculé
      via le même algorithme que `slugify()` de `src/lib/utils.ts`), `ald.json`
      (liste officielle des 30 ALD exonérantes).
- [x] **`scripts/seo-data/fetch-communes.mjs`** : interroge l'API publique
      `geo.api.gouv.fr` (gratuite, sans clé), filtre par seuil de population
      configurable (`--threshold=`, défaut **2000 habitants**) pour éviter de
      générer des pages pour des communes sans aucun volume de recherche,
      joint avec `departments.json`, écrit `src/data/seo/communes.json`.
- [x] **`scripts/seo-data/fetch-hospitals.mjs`** : découvre le jeu de données
      FINESS sur data.gouv.fr (ou lit un CSV local via `--input=`), parse et
      filtre les établissements pertinents (hôpitaux, CHU/CHR, cliniques,
      centres de dialyse — pas les pharmacies/laboratoires), écrit
      `src/data/seo/hospitals.json`.
- [x] **`scripts/seo-data/generate-sitemap.mjs`** : régénère
      `public/sitemap.xml` à partir des pages statiques + `communes.json`
      (ou d'une liste de secours identique aux 8 villes actuelles tant que
      `communes.json` n'existe pas). Branché dans `npm run build`, donc
      toujours à jour et sans dépendance réseau au déploiement.
- [x] **`.github/workflows/refresh-seo-data.yml`** : exécute
      `npm run seo:build-data` tous les mois (cron) dans un environnement CI
      qui a un accès réseau réel, et ouvre une Pull Request si les données ont
      changé.

**Mise à jour — premier run réel effectué** : `fetch-communes.mjs` a été
exécuté via le workflow et a produit **5509 communes** (seuil 2000 habitants)
dans `src/data/seo/communes.json` — cette partie fonctionne. `fetch-hospitals.mjs`
a en revanche pris le premier résultat de la recherche data.gouv.fr, qui
n'était pas le fichier national officiel mais un ré-export régional
("Carte Etablissements FINESS 76 dec2025"), et a échoué car ce dataset
n'exposait pas de ressource CSV exploitable. Corrigé : le script scanne
maintenant 20 candidats et les classe par un score qui pénalise les titres
mentionnant un département isolé ou "carte" et favorise le fichier le plus
volumineux (le national). Le workflow exécute aussi communes et hôpitaux
comme deux étapes indépendantes (`continue-on-error`), pour ne plus perdre le
résultat des communes si les hôpitaux échouent.

Un deuxième run réel a ensuite révélé le vrai format du fichier "stock"
FINESS : **pas de ligne d'en-têtes du tout**. La ligne 1 est un manifeste
(`finess;etalab;98;date`), et chaque ligne de données commence par une
étiquette de type d'enregistrement (`structureet` pour l'identité/adresse de
l'établissement — d'autres types comme `geolocalisationet` cohabitent dans le
même fichier). Corrigé avec un mapping positionnel fixe pour les lignes
`structureet` (voir `STRUCTUREET_COLS` dans `fetch-hospitals.mjs`), validé
avec les vraies lignes remontées par le workflow (CH de Fleyriat, CH Bugey
Sud, CH du Pays de Gex...). Point en attente : les coordonnées lat/lon ne
sont pas dans les lignes `structureet` (probablement dans les lignes
`geolocalisationet` du même fichier, non exploitées pour l'instant — champs
laissés à `null`) ; à reprendre en Sprint 4 si les pages hôpitaux ont besoin
d'une carte.

**Action requise pour finaliser Sprint 1** :

1. Relancer le workflow `refresh-seo-data` ("Run workflow" dans l'onglet
   Actions), **ou** en local :
   ```
   pnpm run seo:communes
   pnpm run seo:hospitals
   ```
2. Si `fetch-hospitals.mjs` ne trouve toujours pas le bon dataset, lister les
   candidats sans télécharger :
   ```
   node scripts/seo-data/fetch-hospitals.mjs --list
   ```
   puis forcer le bon choix une fois identifié sur data.gouv.fr :
   ```
   node scripts/seo-data/fetch-hospitals.mjs --dataset=<slug-du-dataset>
   # ou directement :
   node scripts/seo-data/fetch-hospitals.mjs --resource-url=<url-du-csv>
   ```
3. Vérifier avec `--debug` que les colonnes détectées correspondent bien aux
   en-têtes réels du CSV (ils varient selon les millésimes FINESS) et ajuster
   `COLUMN_PATTERNS` dans `fetch-hospitals.mjs` si besoin.

---

## Sprint 2 — Pages villes pilotées par les données

- [ ] Générer `communes.json` / `hospitals.json` réels (voir action requise
      ci-dessus).
- [ ] Refondre `src/routes/$department.$city.tsx` pour lire
      `communes.json` au lieu de l'objet `cityData` codé en dur (8 villes).
- [ ] **Corriger le contenu fin actuel** : aujourd'hui, n'importe quel slug
      ville/département inventé retourne une page 200 avec un contenu
      générique fabriqué (`"Centre hospitalier local"`, `departmentCode: "XX"`).
      C'est exactement le anti-pattern à éviter. La route doit renvoyer une
      404 (`notFound()`) pour tout couple département/ville absent du jeu de
      données.
- [ ] Lier chaque page ville aux hôpitaux réels les plus proches (via
      `hospitals.json`) au lieu de la liste actuelle saisie à la main.
- [ ] Ajouter une page liste par département (`/$department`) pour le
      maillage interne (Google découvre les villes sans dépendre uniquement
      du sitemap).

## Sprint 3 — Pages maladies (ALD)

- [ ] `/maladies` (index des 30 ALD) + `/maladies/$ald` (une page par
      affection : contexte, prise en charge du transport, CTA réservation).
- [ ] **Vérification éditoriale obligatoire** : `ald.json` contient les noms
      officiels des 30 ALD, mais le contenu rédactionnel de chaque page
      (taux de prise en charge, conditions) doit être relu et validé contre
      ameli.fr avant publication — sujet réglementé, données de santé.
- [ ] Différencier ces pages de l'article de blog généraliste existant
      (`/blog/ald-transport`) : le blog reste l'angle généraliste, les pages
      `/maladies/$ald` ciblent chacune une requête longue traîne
      ("transport [pathologie] remboursé").
- [ ] Ajouter ces URLs à `generate-sitemap.mjs`.

## Sprint 4 — Pages hôpitaux

- [ ] `/hopitaux/$slug` par établissement FINESS : nom, adresse, ville liée,
      CTA "Taxi conventionné vers [Hôpital]".
- [ ] Maillage croisé : la page ville liste ses hôpitaux, la page hôpital
      renvoie vers sa ville.
- [ ] Prioriser CHU/CH/cliniques significatives ; le filtre par catégorie
      dans `fetch-hospitals.mjs` exclut déjà pharmacies/laboratoires.

## Sprint 5 — Qualité de contenu & anti-duplicate

Le risque principal à cette échelle est la pénalité Google pour pages quasi
identiques (seul le nom change). Pistes :

- [ ] Rendre le contenu réellement variable (hôpitaux réels proches,
      population, spécificités locales) plutôt qu'un texte figé avec
      substitution de nom.
- [ ] **Option contenu enrichi par LLM** (mentionnée par le porteur de
      projet) : script `generate-copy.mjs` qui appelle une API (Claude ou
      Gemini) pour rédiger une intro unique par ville/maladie à partir des
      données structurées, avec relecture humaine avant publication.
      Nécessite une clé API et un budget à valider séparément — à discuter
      avant implémentation.
- [ ] Si le nombre total d'URLs dépasse 50 000 (limite d'un fichier
      sitemap), passer à un sitemap index multi-fichiers.

## Sprint 6 — Suivi & validation

- [ ] Soumettre `sitemap.xml` dans Google Search Console.
- [ ] Suivre le taux de pages indexées vs soumises pour détecter un problème
      de qualité avant qu'il n'affecte l'ensemble du site.
- [ ] Valider les structured data (`LocalBusiness`, futur balisage dédié aux
      pages maladies) avec l'outil de test de Google.
