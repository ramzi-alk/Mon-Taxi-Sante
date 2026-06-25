import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface BlogLayoutProps {
  category: string;
  title: string;
  readingTime: string;
  publishedAt: string;
  children: ReactNode;
}

export function BlogLayout({
  category,
  title,
  readingTime,
  publishedAt,
  children,
}: BlogLayoutProps) {
  return (
    <>
      <section className="bg-[#0B0F1C] text-white">
        <div className="container max-w-3xl py-16 md:py-20">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Tous les guides patients
          </Link>
          <p className="text-xs font-bold tracking-[0.15em] text-[#4F6EF7] uppercase mb-4">
            {category}
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {title}
          </h1>
          <p className="mt-4 text-sm text-white/50">
            Publié le {publishedAt} · {readingTime} de lecture
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="container max-w-3xl py-16 md:py-20">
          <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-[#0B0F1C] prose-a:text-[#1244E8] prose-a:no-underline hover:prose-a:underline">
            {children}
          </div>
        </div>
      </section>

      <section className="bg-[#1244E8] text-white">
        <div className="container py-16 md:py-20 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">
            Prêt à réserver votre transport médical ?
          </h2>
          <p className="text-white/70 mb-8">
            Réservation en ligne en 5 minutes, Tiers-Payant intégral, zéro
            avance de frais.
          </p>
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-[#1244E8] hover:bg-blue-50 transition-colors font-bold"
          >
            Réserver maintenant
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
