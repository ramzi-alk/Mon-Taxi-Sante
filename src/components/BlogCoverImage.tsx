import { useState } from "react";
import { getBlogImageUrl } from "~/lib/blogImages";

interface BlogCoverImageProps {
  slug: string;
  title: string;
  className?: string;
}

// N'affiche rien tant que l'article n'a pas encore d'image envoyée depuis
// /admin/blog-images (fichier {slug}.webp absent du bucket -> 404 -> masqué).
export function BlogCoverImage({ slug, title, className }: BlogCoverImageProps) {
  const [hasError, setHasError] = useState(false);
  if (hasError) return null;

  return (
    <img
      src={getBlogImageUrl(slug)}
      alt={title}
      loading="lazy"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
