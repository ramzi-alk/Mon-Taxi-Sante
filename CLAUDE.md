# Conventions de ce projet

## Formulaires / inputs

Toujours utiliser les composants shadcn/ui pour les champs de formulaire,
au lieu d'éléments HTML bruts avec des classes Tailwind écrites à la main :

- `Input` (`~/components/ui/input`) pour text, tel, email, password, number,
  date, time, etc.
- `Textarea` (`~/components/ui/textarea`) pour les zones de texte multilignes.
- `Checkbox` (`~/components/ui/checkbox`, basé sur `@radix-ui/react-checkbox`)
  pour les cases à cocher. Comme ce n'est pas un `<input>` natif, le binding
  avec react-hook-form se fait via `checked={watch(...)}` /
  `onCheckedChange={(checked) => setValue(..., checked === true)}` plutôt que
  `{...register(...)}`.
- `Select` / `SelectTrigger` / `SelectValue` / `SelectContent` / `SelectItem`
  (`~/components/ui/select`, basé sur `@radix-ui/react-select`) pour les
  listes déroulantes. Même principe que `Checkbox` : binding via
  `value={watch(...)}` / `onValueChange={(v) => setValue(..., v as ...)}`.

Les radio, fichiers et inputs cachés restent en `<input>` natif — la
primitive Radix dédiée (`RadioGroup`) n'est pas encore utilisée dans ce
projet. Si on l'ajoute un jour, suivre le même principe : créer le composant
dans `src/components/ui/`, puis migrer.
