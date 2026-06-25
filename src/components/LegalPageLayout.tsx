import type { ReactNode } from "react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <>
      <section className="bg-[#0B0F1C] text-white">
        <div className="container py-16 md:py-20">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-white/50">
            Dernière mise à jour : {lastUpdated}
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
    </>
  );
}
