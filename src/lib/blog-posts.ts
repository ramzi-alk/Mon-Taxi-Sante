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
    title: "Transport pris en charge Assurance Maladie : tout savoir",
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
      "Qu'est-ce qu'une PMT, qui peut la délivrer, les 3 points à vérifier avant de réserver et comment la joindre à votre réservation.",
    readingTime: "5 min",
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
  {
    slug: "vsl-ou-taxi-conventionne",
    to: "/blog/vsl-ou-taxi-conventionne",
    category: "Transport sanitaire",
    title: "Taxi conventionné, VSL ou ambulance : quelle différence ?",
    excerpt:
      "Véhicule, conducteur, tarif : les différences entre taxi conventionné, VSL et ambulance, et comment choisir selon votre état de santé.",
    readingTime: "4 min",
    publishedAt: "21 juillet 2026",
  },
  {
    slug: "taxi-sans-prescription",
    to: "/blog/taxi-sans-prescription",
    category: "Démarches",
    title: "Taxi conventionné sans prescription médicale : est-ce possible ?",
    excerpt:
      "Ce qui change pour votre remboursement si vous n'avez pas encore de Prescription Médicale de Transport, et comment régulariser votre dossier.",
    readingTime: "3 min",
    publishedAt: "21 juillet 2026",
  },
  {
    slug: "transport-pmr-personnes-agees",
    to: "/blog/transport-pmr-personnes-agees",
    category: "Accessibilité",
    title: "Taxi PMR : transport médical pour fauteuil roulant",
    excerpt:
      "Véhicule adapté au fauteuil roulant, prise en charge Assurance Maladie et démarches pour réserver un Taxi PMR.",
    readingTime: "3 min",
    publishedAt: "21 juillet 2026",
  },
  {
    slug: "accompagnant-taxi-conventionne",
    to: "/blog/accompagnant-taxi-conventionne",
    category: "Démarches",
    title: "Accompagnant en taxi conventionné : règles et prise en charge",
    excerpt:
      "Un proche peut-il vous accompagner en taxi conventionné ou VSL ? Les règles de l'Assurance Maladie et comment réserver votre trajet.",
    readingTime: "5 min",
    publishedAt: "1er septembre 2026",
  },
  {
    slug: "traitements-reguliers-taxi-conventionne",
    to: "/blog/traitements-reguliers-taxi-conventionne",
    category: "ALD",
    title: "Taxi conventionné et soins réguliers : chimio, radiothérapie, dialyse",
    excerpt:
      "Chimiothérapie, radiothérapie, dialyse : comment organiser vos transports réguliers en taxi conventionné, avec prise en charge à 100 % et zéro avance de frais.",
    readingTime: "6 min",
    publishedAt: "2 septembre 2026",
  },
  {
    slug: "taxi-conventionne-grossesse",
    to: "/blog/taxi-conventionne-grossesse",
    category: "Prise en charge",
    title: "Taxi conventionné et grossesse : prise en charge et conseils",
    excerpt:
      "Échographies, rendez-vous mensuels, préparation à l'accouchement : comment bénéficier d'un taxi conventionné pendant votre grossesse avec la CPAM.",
    readingTime: "5 min",
    publishedAt: "3 septembre 2026",
  },
  {
    slug: "retour-domicile-sortie-hopital",
    to: "/blog/retour-domicile-sortie-hopital",
    category: "Démarches",
    title: "Sortie d'hôpital : votre retour en taxi conventionné",
    excerpt:
      "Comment organiser votre retour à domicile après une hospitalisation ? Qui rédige votre bon de transport et comment bénéficier du Tiers-Payant.",
    readingTime: "5 min",
    publishedAt: "4 septembre 2026",
  },
  {
    slug: "taxi-conventionne-sans-avance-frais",
    to: "/blog/taxi-conventionne-sans-avance-frais",
    category: "Prise en charge",
    title: "Taxi conventionné : comment être remboursé sans avancer les frais ?",
    excerpt:
      "Les conditions concrètes du Tiers-Payant en taxi conventionné : documents à fournir, et ce qui se passe s'il en manque un le jour du trajet.",
    readingTime: "4 min",
    publishedAt: "5 septembre 2026",
  },
  {
    slug: "transport-medical-plusieurs-rendez-vous",
    to: "/blog/transport-medical-plusieurs-rendez-vous",
    category: "Démarches",
    title: "Transport médical : gérer plusieurs rendez-vous en taxi conventionné",
    excerpt:
      "Plusieurs consultations le même jour ou la même semaine ? Comment organiser vos trajets en taxi conventionné, PMT à l'appui, sans stress.",
    readingTime: "5 min",
    publishedAt: "6 septembre 2026",
  },
  {
    slug: "taxi-conventionne-ou-ambulance-rendez-vous",
    to: "/blog/taxi-conventionne-ou-ambulance-rendez-vous",
    category: "Transport sanitaire",
    title: "Taxi conventionné ou ambulance : quel transport médical choisir ?",
    excerpt:
      "Transport assis ou allongé ? Qui décide entre taxi conventionné et ambulance pour un rendez-vous médical, et ce que dit votre prescription.",
    readingTime: "5 min",
    publishedAt: "7 septembre 2026",
  },
  {
    slug: "transport-sanitaire-proche-demarches",
    to: "/blog/transport-sanitaire-proche-demarches",
    category: "Démarches",
    title: "Transport sanitaire d'un proche : démarches et conseils",
    excerpt:
      "Aidant familial ? Les démarches pour organiser le transport médical d'un proche âgé ou malade en taxi conventionné, sans avance de frais.",
    readingTime: "6 min",
    publishedAt: "8 septembre 2026",
  },
  {
    slug: "taxi-conventionne-accident-travail",
    to: "/blog/taxi-conventionne-accident-travail",
    category: "Prise en charge",
    title: "Accident du travail et taxi conventionné : prise en charge",
    excerpt:
      "Victime d'un accident du travail ou d'une maladie professionnelle ? Comment bénéficier d'un transport sanitaire à 100 % sans avance de frais.",
    readingTime: "5 min",
    publishedAt: "10 septembre 2026",
  },
  {
    slug: "taxi-conventionne-cure-thermale",
    to: "/blog/taxi-conventionne-cure-thermale",
    category: "Prise en charge",
    title: "Cure thermale : le transport en taxi conventionné est-il remboursé ?",
    excerpt:
      "Les règles strictes de l'Assurance Maladie pour le remboursement de vos trajets vers une cure thermale : conditions de ressources et base de remboursement.",
    readingTime: "4 min",
    publishedAt: "14 septembre 2026",
  },
  {
    slug: "taxi-conventionne-dimanche-nuit-jour-ferie",
    to: "/blog/taxi-conventionne-dimanche-nuit-jour-ferie",
    category: "Prise en charge",
    title: "Taxi conventionné la nuit ou le dimanche : est-ce possible ?",
    excerpt:
      "Peut-on réserver un taxi conventionné en dehors des heures ouvrées ? Les règles de la CPAM pour la nuit, les dimanches et les jours fériés.",
    readingTime: "4 min",
    publishedAt: "15 septembre 2026",
  },
  {
    slug: "bagages-materiel-taxi-conventionne",
    to: "/blog/bagages-materiel-taxi-conventionne",
    category: "Prise en charge",
    title: "Bagages et matériel en taxi conventionné : que peut-on emporter ?",
    excerpt:
      "Valise d'hospitalisation, déambulateur, fauteuil roulant : quel matériel emporter lors de votre trajet en taxi médicalisé.",
    readingTime: "4 min",
    publishedAt: "16 septembre 2026",
  },
  {
    slug: "transport-sanitaire-psychiatrie-ald-23",
    to: "/blog/transport-sanitaire-psychiatrie-ald-23",
    category: "ALD",
    title: "Santé mentale (ALD 23) : vos droits au transport médicalisé",
    excerpt:
      "Vos droits au taxi conventionné pour vos soins psychiatriques (CMP, hôpital de jour) dans le cadre de l'ALD 23, sans avance de frais.",
    readingTime: "4 min",
    publishedAt: "17 septembre 2026",
  },
  {
    slug: "annulation-retard-taxi-conventionne",
    to: "/blog/annulation-retard-taxi-conventionne",
    category: "Démarches",
    title: "Annulation ou retard de rendez-vous : quid de votre taxi ?",
    excerpt:
      "Rendez-vous annulé ou retard imprévu ? Comment gérer ces aléas avec votre taxi conventionné, sans frais et sans nouvelle prescription.",
    readingTime: "4 min",
    publishedAt: "18 septembre 2026",
  },
  {
    slug: "transfert-inter-hospitalier-taxi-conventionne",
    to: "/blog/transfert-inter-hospitalier-taxi-conventionne",
    category: "Démarches",
    title: "Transfert entre deux hôpitaux : qui organise et paie le transport ?",
    excerpt:
      "Vous ou un proche êtes transféré d'un hôpital à un autre ? Les règles du transfert inter-hospitalier et la prise en charge financière.",
    readingTime: "4 min",
    publishedAt: "19 septembre 2026",
  },
];
