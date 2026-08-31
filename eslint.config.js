import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// Volontairement minimal : l'objectif de ce Sprint 2 est un premier filet
// (règles des hooks React + bases TypeScript), pas d'imposer un style sur
// 32k lignes existantes sans tests pour valider chaque correction en masse.
// react-hooks/exhaustive-deps reste en "warn" — de vraies violations
// existent déjà dans le code (voir chauffeur.tsx) et les corriger une par
// une nécessite de vérifier le comportement de chacune au cas par cas,
// hors périmètre de ce sprint.
export default tseslint.config(
  {
    ignores: [
      "dist",
      ".vercel",
      ".output",
      ".tanstack",
      ".vinxi",
      "src/routeTree.gen.ts",
      // Assets tiers (vendor JS minifié, servis tels quels) et fichier
      // Figma volumineux — jamais du code source du projet.
      "assets/**",
      "public/assets/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      // src/server/** et src/repositories/** tournent côté Node (server
      // functions TanStack Start) ; le reste dans le navigateur — les deux
      // cohabitent dans src/ sans frontière de dossier stricte, donc les
      // deux jeux de globales plutôt qu'un découpage par chemin.
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Beaucoup de handlers/params intentionnellement non utilisés dans ce
      // code (signatures de callbacks tiers, destructuring partiel) —
      // laissé au jugement du relecteur plutôt qu'imposé par le linter.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      // Plusieurs catch {} vides et volontaires (best-effort : localStorage,
      // lecture audio, heartbeat — voir les commentaires sur chaque site).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // scripts/ (génération SEO, vérification de parité tarifaire) tourne en
    // Node, pas dans un bundle Vite — src/server/** aussi, mais son code y
    // passe par le bundler donc reste sous globals.browser ci-dessus.
    files: ["scripts/**/*.mjs", "*.config.{js,ts,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["e2e/**/*.{js,mjs}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // Service worker (public/sw.js) : `self`/`clients` viennent de
    // ServiceWorkerGlobalScope, absent de globals.browser (qui décrit
    // `window`, pas un contexte worker).
    files: ["public/sw.js"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  }
);
