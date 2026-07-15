// JSON-LD BreadcrumbList réutilisable — https://schema.org/BreadcrumbList.
// Reflète exactement le fil d'Ariane visible (nav aria-label="Fil d'Ariane")
// de chaque gabarit, sans étape inventée. `items` doit inclure la page
// courante en dernière position, avec des URLs absolues.
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, url }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
