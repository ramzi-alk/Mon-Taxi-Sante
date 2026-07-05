// JSON-LD FAQPage réutilisable — voir https://schema.org/FAQPage. Utilisé sur
// les pages ville, maladie et hôpital dont la section FAQ visible sert
// directement de source (pas de contenu supplémentaire inventé pour le
// schema).
export function FaqSchema({ items }: { items: { q: string; a: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: {
        "@type": "Answer",
        text: a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
