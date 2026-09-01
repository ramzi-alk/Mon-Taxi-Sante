// Balises <link> canonical + hreflang à poser sur chaque route indexable.
// Le site n'a qu'une seule version (français, France) : les balises hreflang
// pointent donc vers la même URL que le canonical (auto-référencement "fr" +
// "x-default"), comme recommandé par Google pour un site mono-langue qui
// souhaite malgré tout déclarer explicitement son ciblage linguistique.
export function canonicalLinks(href: string) {
  return [
    { rel: "canonical", href },
    { rel: "alternate", hrefLang: "fr", href },
    { rel: "alternate", hrefLang: "x-default", href },
  ];
}
