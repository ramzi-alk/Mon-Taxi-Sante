import aldData from "~/data/seo/ald.json";
import aldCopyData from "~/data/seo/ald-copy.json";

export interface Ald {
  numero: number;
  slug: string;
  nom: string;
  nomCourt: string;
  soinsAssocies: string;
  // Introduction générée par LLM (scripts/seo-data/generate-copy.mjs) — null
  // tant que le script n'a pas encore été lancé pour cette ALD (les pages
  // retombent alors sur un texte générique, voir maladies.$ald.tsx).
  introText: string | null;
}

const aldCopy = aldCopyData as Record<string, string>;

export const aldList: Ald[] = (aldData as Omit<Ald, "introText">[]).map((a) => ({
  ...a,
  introText: aldCopy[a.slug] ?? null,
}));
