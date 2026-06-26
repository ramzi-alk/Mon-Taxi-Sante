# Conventions de ce projet

## Formulaires / inputs

Toujours utiliser le composant `Input` de shadcn/ui (`~/components/ui/input`)
pour les champs de formulaire (text, tel, email, number, date, etc.), au lieu
d'une balise `<input>` HTML brute avec des classes Tailwind écrites à la
main. Le composant n'existe pas encore dans `src/components/ui/` — il faut
l'ajouter (`npx shadcn add input` ou créer le fichier à la main sur le modèle
de `src/components/ui/button.tsx`, en réutilisant `cn` de `~/lib/utils`) avant
de l'utiliser dans un nouveau formulaire, et migrer les `<input>` existants
au fil des modifications de chaque fichier plutôt qu'en un seul gros refactor.
