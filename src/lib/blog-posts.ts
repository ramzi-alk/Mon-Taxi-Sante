export interface BlogPost {
  slug: string;
  to: string;
  category: string;
  title: string;
  excerpt: string;
  readingTime: string;
  publishedAt: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "transport-cpam",
    to: "/blog/transport-cpam",
    category: "Prise en charge",
    title: "Transport pris en charge CPAM : tout savoir",
    excerpt:
      "Quelles situations médicales ouvrent droit à un transport remboursé, comment fonctionne le Tiers-Payant et quelles démarches effectuer.",
    readingTime: "5 min",
    publishedAt: "12 mars 2026",
  },
  {
    slug: "pmt-prescription",
    to: "/blog/pmt-prescription",
    category: "Démarches",
    title: "Prescription médicale de transport (PMT) : mode d'emploi",
    excerpt:
      "Qu'est-ce qu'une PMT, qui peut la délivrer, sa durée de validité et comment la joindre à votre réservation.",
    readingTime: "4 min",
    publishedAt: "28 mars 2026",
  },
  {
    slug: "ald-transport",
    to: "/blog/ald-transport",
    category: "ALD",
    title: "Transport ALD : tout savoir",
    excerpt:
      "Affection de Longue Durée et transport sanitaire : prise en charge à 100 %, pathologies concernées et démarches à suivre.",
    readingTime: "5 min",
    publishedAt: "9 avril 2026",
  },
];
