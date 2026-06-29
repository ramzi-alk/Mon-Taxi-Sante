import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

export interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
};

/** Interactive 1-5 star picker, or a read-only display when `readOnly` (e.g. an average rating). */
export function StarRating({ value, onChange, readOnly = false, size = "md", className }: StarRatingProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const displayValue = hovered ?? value;

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `${value} étoile${value === 1 ? "" : "s"} sur 5` : "Note sur 5 étoiles"}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          role={readOnly ? undefined : "radio"}
          aria-checked={readOnly ? undefined : value === star}
          aria-label={readOnly ? undefined : `${star} étoile${star === 1 ? "" : "s"}`}
          tabIndex={readOnly ? -1 : 0}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={cn(
            "focus-visible:outline-none",
            readOnly ? "cursor-default" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          )}
        >
          <Star
            className={cn(
              SIZE_CLASSES[size],
              star <= displayValue ? "fill-amber-400 text-amber-400" : "fill-transparent text-gray-300"
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
