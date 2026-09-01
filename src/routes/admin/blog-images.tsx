import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "~/lib/supabase";
import { blogPosts } from "~/lib/blog-posts";
import { compressImageToWebp } from "~/lib/imageCompression";
import * as storageRepository from "~/repositories/storageRepository";
import { useToast } from "~/components/ui/toast";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/admin/blog-images")({
  head: () => ({
    meta: [{ title: "Images du blog — Administration — Docteur Taxi" }],
  }),
  component: AdminBlogImagesPage,
});

const BUCKET = "blog-images";

function publicImageUrl(slug: string, cacheBust?: number) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${slug}.webp`);
  return cacheBust ? `${data.publicUrl}?v=${cacheBust}` : data.publicUrl;
}

function AdminBlogImagesPage() {
  const { toast } = useToast();
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFile(slug: string, title: string, file: File) {
    setUploadingSlug(slug);
    try {
      const originalKb = Math.round(file.size / 1024);
      const compressed = await compressImageToWebp(file);
      const compressedKb = Math.round(compressed.size / 1024);

      const url = await storageRepository.uploadFile(supabase, BUCKET, `${slug}.webp`, compressed, {
        upsert: true,
        contentType: "image/webp",
      });
      if (!url) throw new Error("upload failed");

      setVersions((prev) => ({ ...prev, [slug]: Date.now() }));
      toast({
        title: "Image mise à jour",
        description: `« ${title} » — ${originalKb} Ko → ${compressedKb} Ko (WebP)`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Échec de l'envoi",
        description: `L'image de « ${title} » n'a pas pu être enregistrée.`,
        variant: "error",
      });
    } finally {
      setUploadingSlug(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Images du blog</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Une image par article, convertie en WebP et compressée automatiquement
        à l&apos;envoi (largeur max. 1200px). Le fichier remplace toujours
        l&apos;image précédente du même article.
      </p>

      <div className="rounded-xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
        {blogPosts.map(({ slug, title, category }) => {
          const isUploading = uploadingSlug === slug;
          return (
            <div key={slug} className="flex items-center gap-4 p-4">
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                <img
                  key={versions[slug] ?? 0}
                  src={publicImageUrl(slug, versions[slug])}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = "block";
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.08em] text-[#1244E8] uppercase">
                  {category}
                </p>
                <p className="font-semibold text-[#0B0F1C] truncate">{title}</p>
                <p className="text-xs text-gray-400 font-mono">{slug}.webp</p>
              </div>

              <button
                type="button"
                onClick={() => inputRefs.current[slug]?.click()}
                disabled={isUploading}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors shrink-0"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : versions[slug] ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-green-500" aria-hidden="true" />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isUploading ? "Envoi…" : "Remplacer l'image"}
              </button>
              <input
                ref={(el) => {
                  inputRefs.current[slug] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(slug, title, file);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
