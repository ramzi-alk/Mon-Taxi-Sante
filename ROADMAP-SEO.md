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
Sud, CH du Pays de Gex...).

**Mise à jour — coordonnées GPS + champs additionnels, confirmées sur un run
réel (2026-07-06)** :
- `fetch-communes.mjs` : `centre`/`surface`/`epci` fonctionnent exactement
  comme documenté. Exemple réel reçu : `{"centre":{"coordinates":[4.9306,
  46.1517]},"surface":1564.5,"epci":{"nom":"CC de la Dombes"}}`. `communes.json`
  régénéré avec succès (PR #34, diff propre).
- `fetch-hospitals.mjs` : le premier essai (jointure `geolocalisationet` par
  scan heuristique de degrés WGS84) a donné **0 coordonnées** — diagnostiqué
  via un run `--debug` dédié (ajout d'un input `workflow_dispatch` au
  workflow). Deux erreurs de supposition initiale :
  1. Le type d'enregistrement s'appelle **`geolocalisation`**, pas
     `geolocalisationet` (jamais trouvé, d'où le 0).
  2. Les coordonnées ne sont **pas en degrés WGS84** mais projetées en
     **Lambert-93/RGF93 (EPSG:2154, mètres)** — indiqué dans un champ CRS de
     la ligne elle-même (`"...EPSG:2154 RGF93 / Lambert-93 (Métropole)"`).
  
  Corrigé : `GEOLOCALISATION_COLS` (index fixes, comme `STRUCTUREET_COLS`) +
  `lambert93ToWGS84()` (formule inverse de la projection conique conforme de
  Lambert, paramètres officiels IGN), avec conversion **uniquement** si le
  champ CRS mentionne Lambert-93/EPSG:2154 (les DROM utilisent d'autres
  projections — UTM — non gérées faute d'exemple réel observé : mieux vaut un
  lat/lon `null` qu'une conversion silencieusement fausse). Vérifié avec la
  vraie ligne remontée par le run `--debug` (FINESS `010000024`, dept. 01) :
  conversion → lat 46.22 / lon 5.21, cohérent avec le département de l'Ain.

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

## Sprint 2 — Pages villes pilotées par les données ✅ TERMINÉ

- [x] Générer `communes.json` (5509 communes) / `hospitals.json` (7474
      établissements) réels, mergés depuis la branche `chore/refresh-seo-data`
      générée par le workflow.
- [x] **`src/lib/seoData.ts`** : module central chargeant `communes.json` /
      `hospitals.json`, avec index par `département/ville`, par département,
      et par commune pour les hôpitaux. Normalise les arrondissements
      Paris/Lyon/Marseille (FINESS utilise des codes INSEE par arrondissement
      — 75101-75120, 69381-69389, 13201-13216 — alors que `communes.json` n'a
      qu'une seule entrée par ville ; sans ce repli, ces 3 grandes villes
      n'auraient affiché aucun hôpital malgré des centaines de résultats).
- [x] Refondre `src/routes/$department.$city.tsx` pour lire les vraies
      données au lieu de l'objet `cityData` codé en dur (8 villes).
- [x] **Corriger le contenu fin** : la route renvoie maintenant `notFound()`
      (404) pour tout couple département/ville absent du jeu de données, au
      lieu de fabriquer une page générique pour n'importe quel slug inventé.
- [x] Lier chaque page ville aux hôpitaux réels les plus proches (via
      `hospitals.json`) au lieu de la liste saisie à la main.
- [x] **`src/routes/$department.index.tsx`** : page liste des communes d'un
      département (triées par population) pour le maillage interne — Google
      découvre les villes sans dépendre uniquement du sitemap.
- [x] **Accès depuis le reste du site** : avant ce point, aucune page ville
      n'était atteignable en cliquant depuis le site (seulement par URL
      directe ou sitemap). Ajouté :
      - `src/routes/villes.tsx` (`/villes`) : hub listant les 18 régions et
        101 départements, chacun renvoyant vers sa page `/$department`.
        Complète la pyramide de maillage Accueil → hub → département → ville.
      - Section "Villes principales" dans `Footer.tsx` (présente sur toutes
        les pages) : les 16 plus grandes villes par population, plus un lien
        vers `/villes`.
      - `generate-sitemap.mjs` inclut maintenant aussi une entrée par page
        département en plus des pages ville (5624 URLs au total : 14 pages
        statiques + 101 départements + 5509 villes).

**Vérifié** : `pnpm build` passe, `npx tsc --noEmit` ne régresse pas (26
erreurs contre 28 avant, aucune nouvelle liée à ce sprint — la seule
attendue, `LoaderFnContext ... => never`, est un défaut préexistant de cette
version alpha de TanStack Router sur *toute* route combinant `head` + un
loader non trivial, déjà présent avant ce sprint, indépendant de la forme des
données retournées). Testé en conditions réelles (serveur de dev + curl) :
`/rhone/lyon` → 200 avec les vrais hôpitaux lyonnais, `/paris/paris` et
`/bouches-du-rhone/marseille` → hôpitaux réels également (validant le repli
arrondissement), `/rhone` → 200 avec 127 communes triées par population,
`/rhone/ville-qui-nexiste-pas` et `/departement-bidon` → 404, `/villes` → 200
avec les 18 régions, Footer → vraies plus grandes villes (Paris, Marseille,
Lyon, Toulouse, Nice, Nantes, Montpellier, Strasbourg, Bordeaux...) présentes
sur la page d'accueil.

### Note — géolocalisation utilisateur (hors périmètre SEO)

Idée évoquée : utiliser la géolocalisation du navigateur pour proposer
automatiquement les hôpitaux proches de l'utilisateur sur la page d'accueil.
Mise de côté pour l'instant :

- **Ça n'aide pas le SEO** : Googlebot ne donne jamais sa position, donc un
  contenu personnalisé côté client n'est jamais indexé — c'est le contenu
  statique par page (ce que ce roadmap construit) qui compte pour le
  référencement. La géolocalisation est une feature de conversion/UX
  distincte, pas un levier SEO.
- **Bloquant technique actuel** : on n'a pas encore de coordonnées GPS
  exploitables. `communes.json` n'a pas de lat/lon (le champ `centre` n'a pas
  été demandé à l'API geo.api.gouv.fr), et les hôpitaux non plus — leurs
  coordonnées vivent dans un autre type d'enregistrement FINESS
  (`geolocalisationet`) non récupéré par `fetch-hospitals.mjs` (voir Sprint 1
  : les lignes `structureet` qu'on lit n'ont pas de coordonnées).

À reprendre comme feature UX séparée si souhaité, après le SEO : il faudrait
(1) demander `centre` à geo.api.gouv.fr pour les communes et/ou joindre les
lignes `geolocalisationet` du fichier FINESS aux hôpitaux, (2) un composant
client qui demande la permission de géolocalisation et calcule la ville/les
hôpitaux les plus proches.

## Sprint 2bis — Barres de recherche + fix bundle client ✅ TERMINÉ

- [x] **Bug de performance corrigé** : `Footer.tsx` (présent sur toutes les
      pages) et les pages villes/département important `~/lib/seoData`
      directement embarquaient communes.json (5509 entrées) et
      hospitals.json (7474 entrées) dans le bundle JS client — jusqu'à
      **4,2 Mo** chargés sur chaque page du site, y compris des pages sans
      aucun rapport (FAQ, tarifs...). Corrigé :
      - `src/data/seo/top-communes.json` (30 entrées) généré par
        `scripts/seo-data/derive-summaries.mjs` — `Footer.tsx` l'importe
        directement au lieu de `~/lib/seoData`.
      - `departments.json` enrichi d'un champ `nombreCommunes` (même
        script) — `/villes` n'a plus besoin d'importer le tableau complet
        des communes pour afficher un compteur.
      - **`src/server/seo.ts`** : les lookups par ville/département/recherche
        passent maintenant par des fonctions serveur (`createServerFn`,
        même mécanisme que `AddressAutocomplete` → Mapbox), qui gardent les
        gros JSON strictement côté serveur. `$department.$city.tsx` et
        `$department.index.tsx` utilisent `loader()` + `useLoaderData()` au
        lieu d'un import direct de `~/lib/seoData` dans le composant.
      - Bonus inattendu : ce passage par `loader()`/`useLoaderData()` a aussi
        fait disparaître l'erreur `LoaderFnContext ... => never` notée au
        Sprint 2 (26 → 24 erreurs `tsc`, aucune sur les routes SEO).
      - Bundle client vérifié après coup : `main-*.js` est passé de 4,2 Mo à
        ~700 Ko (le reliquat de 30 entrées `top-communes.json`, voulu).
- [x] **`src/lib/seoData.ts`** : ajout de `searchCommunes(query, limit)`
      (préfixe > sous-chaîne, puis population décroissante).
- [x] **`src/components/CitySearch.tsx`** : champ de recherche ville
      (debounce 250 ms, navigation clavier, façon `AddressAutocomplete`) qui
      appelle `searchCommunesServerFn` et redirige vers `/$department/$city`
      au choix. Intégré sur la page d'accueil (hero) et sur `/villes`.
- [x] Filtres client-side (déjà en place, pas de fonction serveur nécessaire
      — données déjà chargées pour la page) : `/villes` filtre les
      régions/départements affichés, `/$department` filtre ses communes.

**Vérifié** : `pnpm build` + `tsc` sans régression. Testé avec Playwright
contre le **build de production réel** (`dist/server/server.js`, pas
`vite dev`) : recherche "lyo" → Lyon/Sainte-Foy-lès-Lyon/Chazelles-sur-Lyon
triés par pertinence puis population, clic → navigation vers
`/rhone/lyon` ou `/bouches-du-rhone/marseille` selon le cas. Bundle client
confirmé sans communes.json/hospitals.json (`grep codeInseeCommune` → 0
résultat dans `dist/client/assets`).

**Note technique (hors scope, pré-existante, non bloquante)** : en mode
`pnpm dev` uniquement, tout appel `createServerFn` (le mien comme
`errorReporting.ts` qui existait déjà) lève `ReferenceError: process is not
defined` dans `@tanstack/start-client-core`'s `createClientRpc` — ce module
lit `process.env.TSS_APP_BASE`/`TSS_SERVER_FN_BASE`, correctement remplacés
au build de production mais pas shimés par le serveur de dev de cette
version alpha. N'affecte que l'expérience de développement local (le build
de production, testé ci-dessus, fonctionne normalement) ; à surveiller si
une mise à jour de `@tanstack/react-start` la corrige.

## Sprint 3 — Pages maladies (ALD) ✅ TERMINÉ (contenu à valider avant mise en avant)

- [x] `/maladies` (index des 30 ALD, avec recherche) + `/maladies/$ald`
      (une page par affection : contexte, prise en charge du transport,
      soins associés, FAQ, CTA réservation). `notFound()` pour tout slug
      inconnu, même principe anti-contenu-fin que pour les villes.
- [x] **`nomCourt` ajouté à `ald.json`** : les noms officiels des 30 ALD
      sont parfois très longs (jusqu'à 173 caractères — ex. "Insuffisance
      cardiaque grave, troubles du rythme graves, cardiopathies
      valvulaires graves, cardiopathies congénitales graves"), ce qui
      produisait des balises `<title>` bien trop longues pour un bon
      affichage dans les résultats Google. `nomCourt` est utilisé pour le
      titre/H1/fil d'Ariane/cartes ; le nom officiel complet reste affiché
      dans le corps de page (section "Qu'est-ce qu'une ALD") pour
      l'exactitude. Titres réduits de ~76 caractères en moyenne (max 88)
      contre jusqu'à 173 avant.
- [x] Différenciées de l'article de blog généraliste existant
      (`/blog/ald-transport`, conservé tel quel) : les pages `/maladies/$ald`
      ciblent chacune une requête longue traîne ("transport [pathologie]
      remboursé"), avec un champ `soinsAssocies` par ALD (type de soins
      associés généralement liés à un besoin de transport) pour un contenu
      réellement différencié plutôt qu'un simple gabarit avec le nom qui
      change.
- [x] Ajoutées à `generate-sitemap.mjs` (30 URLs) + lien `/maladies` dans
      le Footer (section Ressources Assurance Maladie).

**⚠️ Vérification éditoriale toujours recommandée avant mise en avant
commerciale/publicitaire** : le contenu utilise volontairement une
formulation générique et prudente (mécanique de prise en charge déjà
présente et vétée dans `/blog/ald-transport`, `soinsAssocies` limité à des
associations de soins largement connues, sans détail clinique spécifique
inventé), mais s'agissant de données de santé réglementées, une relecture
contre ameli.fr reste recommandée avant toute campagne d'acquisition
ciblée sur ces pages.

**Vérifié** : `pnpm build` + `tsc` sans régression notable (25 erreurs,
la seule nouvelle étant la même quirk `LoaderFnContext ... => never`
déjà documentée au Sprint 2bis, propre à cette version alpha de TanStack
Router, sans impact fonctionnel). Testé en conditions réelles : `/maladies`
→ 200 avec recherche, `/maladies/tumeur-maligne-cancer` → 200 avec titre
court "Taxi conventionné Cancer — 100% remboursé", `/maladies/avc`
(slug inventé) → 404.

## Sprint 4 — Pages hôpitaux ✅ TERMINÉ

- [x] **`/hopitaux/$slug`** par établissement FINESS : nom, catégorie,
      adresse, téléphone, ville liée, CTA "Taxi conventionné vers
      [Hôpital]", et une section "Autres établissements à [ville]".
      `notFound()` pour tout slug inconnu. Uniquement pour les
      établissements reliés à une ville connue (`departementSlug` non
      null) — pas de page orpheline pour les ~1350 restants dont la
      commune est sous le seuil de population de `communes.json`.
- [x] Maillage croisé : la page ville lie chaque nom d'hôpital vers sa page
      `/hopitaux/$slug` (avant : texte brut) ; la page hôpital renvoie vers
      sa ville et liste les autres établissements du même endroit.
- [x] `slug` généré (nom + ville, dédoublonné par FINESS en cas de
      collision) dans `fetch-hospitals.mjs` pour les futurs runs, et
      backfillé sur `hospitals.json` déjà commité via
      `scripts/seo-data/backfill-hospital-slugs.mjs` (pas de re-fetch réseau
      nécessaire).
- [x] Filtre par catégorie déjà en place dans `fetch-hospitals.mjs` (exclut
      pharmacies/laboratoires) — inchangé.
- [x] **Bug trouvé et corrigé en cours de route** : la normalisation des
      arrondissements Paris/Lyon/Marseille (codes INSEE 75101-75120,
      69381-69389, 13201-13216 → 75056/69123/13055) n'existait que dans la
      couche d'affichage (`seoData.ts`, Sprint 2), pas dans
      `fetch-hospitals.mjs` lui-même. Résultat : 248 hôpitaux de ces trois
      villes avaient `departementSlug: null` dans les données malgré un
      `codeInseeCommune` résolu, et n'auraient reçu aucun slug/page. Corrigé
      dans `fetch-hospitals.mjs` (pour les futurs runs) et rétro-appliqué
      aux données déjà commitées via le script de backfill (qui répare
      d'abord le lien ville avant de générer les slugs). Total après
      correction : **6116 pages hôpitaux** (contre 5868 avant le fix).
- [x] URLs ajoutées à `generate-sitemap.mjs` (11 771 URLs au total).

**Vérifié** : `pnpm build` + `tsc` sans régression (25 erreurs, aucune
nouvelle). Bundle client stable (~710 Ko, les hôpitaux passent par
`getHospitalPageDataServerFn`, pas d'import direct). Testé en conditions
réelles : `/hopitaux/aural-unite-dialyse-hop-croix-rousse-lyon` → 200, lien
vers `/rhone/lyon` et vers d'autres établissements lyonnais présents ; page
ville → liens cliquables vers chaque hôpital ; slug inventé → 404.

## Sprint 4bis — Recherche d'établissement, JSON-LD, maillage croisé ✅ TERMINÉ

- [x] **Accueil** : section "Pour quelles situations médicales ?" — les
      libellés correspondant à une ALD précise (dialyse, chimio/
      radiothérapie, soins psychiatriques) deviennent des liens vers leur
      page `/maladies/$ald` ; "Consultations ALD" renvoie vers l'index
      `/maladies`.
- [x] **`HospitalSearch`** (façon `CitySearch`) : remplace la carte statique
      "+ Tous autres établissements" (qui ne menait nulle part) sur la page
      ville par une vraie recherche, scopée au département courant.
      `searchHospitals()` dans `seoData.ts` + `searchHospitalsServerFn`.
- [x] **`FaqSchema`** (composant partagé, JSON-LD `FAQPage`) appliqué aux
      trois gabarits (ville, maladie — qui l'avaient sans schema — et
      hôpital, où une section FAQ a été ajoutée, elle n'existait pas).
- [x] **JSON-LD `MedicalClinic`** sur la page hôpital (absent jusqu'ici —
      seule la page ville avait un schema `LocalBusiness`).
- [x] **Maillage croisé enrichi** :
      - page maladie → `CitySearch` ("Trouvez le service dans votre ville")
      - page hôpital → lien vers l'ALD associée quand la catégorie FINESS
        le permet de façon fiable (`dialyse` → néphropathie chronique,
        `maladies mentales`/`psychiatr` → affections psychiatriques — les
        seules catégories de ce type effectivement présentes dans les
        données ; pas de correspondance oncologie/cardiologie inventée
        faute de catégorie FINESS distincte pour ces spécialités)
      - page ville → bloc de 5 ALD à forte notoriété (cancer, dialyse,
        diabète, AVC, psychiatrie) + lien vers les 30

**Vérifié** : `pnpm build` + `tsc` sans régression (25 erreurs, aucune
nouvelle). Testé en conditions réelles (build de production) : recherche
d'hôpital fonctionnelle et scopée au département, JSON-LD `FAQPage`/
`MedicalClinic` présents sur les 3 gabarits, lien ALD correct sur une page
hôpital de dialyse.

## Sprint 5 — Qualité de contenu & anti-duplicate ✅ TERMINÉ

Le risque principal à cette échelle est la pénalité Google pour pages quasi
identiques (seul le nom change).

- [x] **Contenu réellement variable, à partir de données déjà disponibles
      (aucun coût, aucune dépendance externe)** :
      - `getPopulationRank()` (`seoData.ts`) : rang réel de la commune dans
        son département (ex. "3e ville la plus peuplée du Rhône"), calculé
        depuis `communes.json` — affiché dans le hero de la page ville.
      - `getNeighboringCommunes()` : au lieu d'un simple "top N du
        département" (qui afficherait les mêmes grandes villes sur toutes
        les pages), une fenêtre autour du rang de population de la commune
        courante — le contenu diffère donc réellement selon la ville
        (vérifié : Lyon voisine de Villeurbanne/Vénissieux/Vaulx-en-Velin/
        Saint-Priest, une petite commune du Rhône voisine de communes tout
        aussi petites). Nouvelle section "Également desservi près de
        {ville}" sur la page ville, avec vrais liens internes.
      - Carte "Chauffeurs locaux" de la section "Pourquoi nous choisir"
        mentionne désormais le nombre réel d'établissements desservis
        plutôt qu'une formule générique.
- [x] **Contenu enrichi par LLM** (mentionnée par le porteur de projet, coût
      estimé et validé : DeepSeek V4 Pro, ~1-1,70 $ pour l'ensemble des ~5539
      pages) : `scripts/seo-data/generate-copy.mjs` appelle l'API DeepSeek
      (endpoint compatible format Anthropic) pour rédiger une intro unique de
      2-3 phrases par ville et par ALD, à partir des données déjà connues
      (population, rang, villes voisines, nombre d'établissements, soins
      associés à l'ALD) — grounding strict (aucun fait hors de ce qui est
      fourni dans le prompt), pas de recherche web (aucun modèle ne le fait
      par défaut sans outil dédié).
      - Sortie : `src/data/seo/city-copy.json` (codeInsee → texte) et
        `src/data/seo/ald-copy.json` (slug ALD → texte), commités vides
        (`{}`) tant que le script n'a pas tourné — le site fonctionne sans
        régression avec le texte générique existant en repli
        (`commune.introText ?? <texte par défaut>`).
      - `seoData.ts` fusionne `city-copy.json` dans `Commune.introText` ;
        `src/lib/aldData.ts` (nouveau) fait de même pour les ALD et remplace
        l'import direct de `ald.json` dans les 3 routes qui l'utilisaient.
      - `pnpm seo:copy` en local (nécessite `DEEPSEEK_API_KEY`), ou workflow
        manuel `.github/workflows/generate-seo-copy.yml`
        (`workflow_dispatch`, secret `DEEPSEEK_API_KEY`, options
        only/limit/force) qui ouvre une PR pour **relecture humaine avant
        merge** — le contenu généré n'atteint jamais `main` sans revue du
        diff.
      - Reprise/idempotence : le script ne régénère que les entrées
        manquantes (sauf `--force`), sauvegarde incrémentale toutes les 50
        villes, retries avec backoff exponentiel par appel.
- [ ] Si le nombre total d'URLs dépasse 50 000 (limite d'un fichier
      sitemap), passer à un sitemap index multi-fichiers. Pas urgent : 11 771
      URLs actuellement, loin de la limite.

**Vérifié** : `pnpm build` + `tsc` sans régression (25 erreurs, identiques
avant/après comparé explicitement via `git stash`). Testé en conditions
réelles (build de production) : rang de population et villes voisines
corrects et différenciés selon la ville, bundle client toujours ~700 Ko
(aucun retour du bundle bloat). Le script `generate-copy.mjs` n'a pas encore
été exécuté (nécessite `DEEPSEEK_API_KEY`, à fournir par le porteur de
projet) — les fichiers `city-copy.json`/`ald-copy.json` sont vides et les
pages utilisent le texte générique de repli jusqu'à la première génération.

## Sprint 6 — Suivi & validation

- [ ] Soumettre `sitemap.xml` dans Google Search Console.
- [ ] Suivre le taux de pages indexées vs soumises pour détecter un problème
      de qualité avant qu'il n'affecte l'ensemble du site.
- [ ] Valider les structured data (`LocalBusiness`, futur balisage dédié aux
      pages maladies) avec l'outil de test de Google.
