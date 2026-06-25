import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "~/lib/blog-posts";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Guides patients — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Tous nos guides pour comprendre la prise en charge CPAM de votre transport médical : ALD, prescription médicale de transport, Tiers-Payant.",
      },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  return (
    <>
      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Ressources CPAM
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Guides patients
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Tout ce qu'il faut savoir sur la prise en charge de votre
            transport médical par l'Assurance Maladie.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FC]">
        <div className="container pb-20 md:pb-28">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 list-none" role="list">
            {blogPosts.map(({ to, category, title, excerpt, readingTime, publishedAt }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-xs font-bold tracking-[0.1em] text-[#1244E8] uppercase mb-3">
                    {category}
                  </p>
                  <h2 className="font-bold text-[#0B0F1C] text-lg mb-2 leading-snug">
                    {title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    {excerpt}
                  </p>
                  <div className="mt-5 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {publishedAt} · {readingTime} de lecture
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-[#1244E8] group-hover:translate-x-0.5 transition-transform"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
