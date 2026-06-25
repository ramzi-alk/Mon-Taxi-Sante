import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Questions fréquentes — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Toutes les réponses à vos questions sur la réservation, la prise en charge CPAM, le Tiers-Payant et les chauffeurs partenaires.",
      },
    ],
  }),
  component: FaqPage,
});

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  category: string;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    category: "Réservation",
    items: [
      {
        question: "Comment réserver un taxi médical ?",
        answer:
          "Rendez-vous sur la page Réserver, renseignez votre adresse de départ, votre destination, la date et l'heure de votre rendez-vous médical, puis validez. Vous recevez une confirmation par SMS et email dès qu'un chauffeur accepte la course.",
      },
      {
        question: "Combien de temps avant mon rendez-vous dois-je réserver ?",
        answer:
          "Nous recommandons de réserver au moins 24h à l'avance pour garantir la disponibilité d'un chauffeur conventionné, mais des réservations en urgence peuvent être prises en compte selon la disponibilité.",
      },
      {
        question: "Puis-je réserver un aller-retour ou des trajets en série ?",
        answer:
          "Oui, le formulaire de réservation permet de choisir un aller simple, un aller-retour, ou des trajets en série pour des soins récurrents (dialyse, chimiothérapie, etc.).",
      },
      {
        question: "Puis-je annuler ou modifier ma réservation ?",
        answer:
          "Oui, toute annulation effectuée plus de 24h avant l'heure prévue est gratuite. Contactez notre service client au 0800 000 000 pour modifier une réservation.",
      },
    ],
  },
  {
    category: "Prise en charge CPAM",
    items: [
      {
        question: "Qu'est-ce que le Tiers-Payant et comment ça marche ?",
        answer:
          "Le Tiers-Payant permet à l'Assurance Maladie de régler directement le chauffeur conventionné, sans que vous ayez à avancer les frais. Il s'applique si vous bénéficiez d'une prise en charge à 100 % et disposez d'une Prescription Médicale de Transport (PMT) valide.",
      },
      {
        question: "Quelles situations médicales sont prises en charge ?",
        answer:
          "Dialyse rénale, chimiothérapie, radiothérapie, rééducation, consultations ALD, soins psychiatriques, maternité et urgences planifiées font partie des situations couramment prises en charge, sous réserve de prescription médicale.",
      },
      {
        question: "Qu'est-ce que la Prescription Médicale de Transport (PMT) ?",
        answer:
          "La PMT est un document signé par votre médecin attestant de la nécessité d'un transport sanitaire. Elle est indispensable pour bénéficier du Tiers-Payant intégral.",
      },
      {
        question: "Je n'ai pas de prise en charge CPAM, puis-je quand même réserver ?",
        answer:
          "Oui, vous pouvez réserver en tant qu'assuré standard ou à frais personnels. Le tarif applicable vous sera communiqué avant la confirmation de votre course.",
      },
    ],
  },
  {
    category: "Pendant le trajet",
    items: [
      {
        question: "Puis-je signaler des besoins spécifiques (fauteuil roulant, brancard, oxygène) ?",
        answer:
          "Oui, le formulaire de réservation permet d'indiquer tout besoin spécifique afin que le chauffeur dispose d'un véhicule adapté (taxi, VSL ou véhicule PMR).",
      },
      {
        question: "Que se passe-t-il si mon chauffeur est en retard ?",
        answer:
          "Vous êtes informé en temps réel par SMS en cas de retard. Notre équipe reste disponible au 0800 000 000 pour vous assister en cas d'imprévu.",
      },
    ],
  },
  {
    category: "Chauffeurs partenaires",
    items: [
      {
        question: "Comment devenir chauffeur partenaire Mon Taxi Santé ?",
        answer:
          "Rendez-vous sur notre page « Devenir chauffeur partenaire » pour déposer votre candidature. Une convention CPAM valide et les certifications requises sont nécessaires.",
      },
      {
        question: "Les chauffeurs sont-ils certifiés ?",
        answer:
          "Tous nos chauffeurs partenaires disposent d'une convention CPAM valide, d'une formation aux gestes de transport sanitaire et d'une assurance professionnelle à jour.",
      },
    ],
  },
];

function FaqPage() {
  return (
    <>
      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            FAQ
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Questions fréquentes
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Vous ne trouvez pas votre réponse ? Appelez-nous au{" "}
            <a href="tel:+33800000000" className="text-[#1244E8] underline">
              0800 000 000
            </a>{" "}
            (gratuit) ou écrivez à{" "}
            <a href="mailto:contact@mon-taxi-sante.fr" className="text-[#1244E8] underline">
              contact@mon-taxi-sante.fr
            </a>
            .
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FC]">
        <div className="container max-w-3xl py-4 pb-20 md:pb-28">
          {faqCategories.map(({ category, items }) => (
            <div key={category} className="mb-12">
              <h2 className="text-sm font-bold tracking-[0.1em] text-[#1244E8] uppercase mb-4">
                {category}
              </h2>
              <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white overflow-hidden">
                {items.map(({ question, answer }) => (
                  <details key={question} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-[#0B0F1C] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {question}
                      <ChevronDown
                        className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-gray-500">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <div className="text-center mt-4">
            <Link
              to="/reservation"
              className="btn-cta inline-flex items-center justify-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
            >
              Réserver mon taxi médical
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
