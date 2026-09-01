import { supabase } from "~/lib/supabase";

const BLOG_IMAGES_BUCKET = "blog-images";

// Convention de nommage : {slug}.webp (voir supabase/migrations/073_blog_images_bucket.sql
// et /admin/blog-images). Ne fait aucun appel réseau — construction d'URL pure,
// utilisable aussi bien côté serveur (SSR) que client.
export function getBlogImageUrl(slug: string): string {
  const { data } = supabase.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(`${slug}.webp`);
  return data.publicUrl;
}
