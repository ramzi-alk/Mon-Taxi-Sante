# Conventions de ce projet

## Formulaires / inputs

Toujours utiliser le composant `Input` de shadcn/ui (`~/components/ui/input`)
pour les champs de formulaire texte (text, tel, email, password, number, date,
time, etc.), au lieu d'une balise `<input>` HTML brute avec des classes
Tailwind écrites à la main. Le composant existe déjà dans
`src/components/ui/input.tsx` (forwardRef, classes de base fusionnées via
`cn()`) et tous les champs texte existants ont été migrés.

Les checkbox, radio, fichiers et inputs cachés restent en `<input>` natif —
shadcn utiliserait des primitives Radix dédiées (`Checkbox`, `RadioGroup`)
qui ne sont pas installées dans ce projet. Si on les ajoute un jour, suivre
le même principe : créer le composant dans `src/components/ui/`, puis
migrer.
