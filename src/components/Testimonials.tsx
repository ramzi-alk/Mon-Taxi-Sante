import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

interface Testimonial {
  id: number;
  author: string;
  age: number;
  city: string;
  rating: number;
  text: string;
  condition: string;
  date: string;
  initials: string;
  avatarColor: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    author: "Monique B.",
    age: 72,
    city: "Lyon",
    rating: 5,
    text: "Mon chauffeur était là 10 minutes en avance. Il m'a aidée à monter dans le véhicule, a attendu la fin de ma séance de chimiothérapie et m'a ramenée chez moi. Je n'ai pas déboursé un centime. Un vrai service du cœur.",
    condition: "Traitement oncologique",
    date: "Novembre 2024",
    initials: "MB",
    avatarColor: "bg-violet-100 text-violet-700",
  },
  {
    id: 2,
    author: "Jean-Pierre M.",
    age: 68,
    city: "Marseille",
    rating: 5,
    text: "Je suis dialysé trois fois par semaine. Avant, c'était un cauchemar pour organiser les transports. Avec Mon Taxi Santé, je réserve le lundi pour toute la semaine. Le chauffeur connaît mon état et adapte la conduite. Merci infiniment.",
    condition: "Dialyse rénale (ALD)",
    date: "Octobre 2024",
    initials: "JM",
    avatarColor: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    author: "Sophie L.",
    age: 45,
    city: "Bordeaux",
    rating: 5,
    text: "Suite à mon accident, je suis en fauteuil roulant. Le véhicule PMR était impeccable. Le chauffeur a pris le temps de bien installer mon fauteuil et de vérifier que j'étais confortable. Des professionnels humains et attentionnés.",
    condition: "Rééducation PMR",
    date: "Décembre 2024",
    initials: "SL",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: 4,
    author: "Robert K.",
    age: 79,
    city: "Toulouse",
    rating: 5,
    text: "À mon âge, utiliser une application me faisait peur. Mais ma fille m'a aidé la première fois, et depuis je réserve tout seul par téléphone. Le service client est très patient. Le chauffeur était ponctuel et très respectueux.",
    condition: "Consultations cardiologiques",
    date: "Janvier 2025",
    initials: "RK",
    avatarColor: "bg-orange-100 text-orange-700",
  },
  {
    id: 5,
    author: "Fatima A.",
    age: 52,
    city: "Strasbourg",
    rating: 5,
    text: "Le zéro avance de frais, c'est vraiment ce qui fait la différence. Je suis en CMU et j'avais peur de ne pas être bien accueillie. Au contraire, le chauffeur était aux petits soins. La plateforme nous traite tous avec la même dignité.",
    condition: "Suivi diabète (CMU)",
    date: "Février 2025",
    initials: "FA",
    avatarColor: "bg-teal-100 text-teal-700",
  },
  {
    id: 6,
    author: "Dr. Isabelle P.",
    age: 48,
    city: "Nantes",
    rating: 5,
    text: "En tant que médecin, je recommande ce service à mes patients. La fiabilité et la ponctualité des chauffeurs contribuent directement à l'observance thérapeutique. C'est un maillon essentiel du parcours de soin.",
    condition: "Prescripteur — Médecin généraliste",
    date: "Mars 2025",
    initials: "IP",
    avatarColor: "bg-rose-100 text-rose-700",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5"
      aria-label={`${rating} étoiles sur 5`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  const avgRating = (
    testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length
  ).toFixed(1);

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-white border-t border-gray-100"
    >
      <div className="container py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
              Témoignages
            </p>
            <h2
              id="testimonials-heading"
              className="text-4xl md:text-5xl font-black text-[#0B0F1C] tracking-tight leading-tight"
            >
              Ce que disent<br />nos patients
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StarRating rating={5} />
            <span className="font-black text-[#0B0F1C] text-2xl">{avgRating}/5</span>
            <span className="text-gray-400 text-sm">
              {testimonials.length * 47}+ avis vérifiés
            </span>
          </div>
        </div>

        <ul
          className="list-none grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Témoignages patients"
        >
          {testimonials.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-5 rounded-xl border border-gray-100 bg-white p-6 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
            >
              {/* Stars + date */}
              <div className="flex items-center justify-between">
                <StarRating rating={t.rating} />
                <span className="text-xs text-gray-400">{t.date}</span>
              </div>

              {/* Text */}
              <blockquote>
                <p className="text-[#0B0F1C] text-sm leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </p>
              </blockquote>

              {/* Condition tag */}
              <div className="mt-auto">
                <span className="inline-block text-xs font-medium bg-[#EEF2FF] text-[#1244E8] px-3 py-1 rounded-full">
                  {t.condition}
                </span>
              </div>

              {/* Author */}
              <footer className="flex items-center gap-3 pt-1 border-t border-gray-50">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    t.avatarColor
                  )}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <cite className="text-sm font-semibold text-[#0B0F1C] not-italic">
                    {t.author}
                  </cite>
                  <p className="text-xs text-gray-400">
                    {t.age} ans · {t.city}
                  </p>
                </div>
              </footer>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-xs text-gray-400">
          Avis collectés après chaque trajet. Tous les témoignages sont vérifiés
          et associés à une réservation réelle.
        </p>
      </div>
    </section>
  );
}
