import { useState } from "react";
import { Loader2 } from "lucide-react";
import { StarRating } from "~/components/ui/star-rating";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";

interface RatingFormProps {
  prompt: string;
  submitLabel: string;
  onSubmit: (rating: number, comment?: string) => void;
  isSubmitting?: boolean;
}

/** 1-5 star picker + optional comment, used to rate the other party once a ride is completed. */
export function RatingForm({ prompt, submitLabel, onSubmit, isSubmitting = false }: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900">{prompt}</p>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Un commentaire à ajouter ? (facultatif)"
        maxLength={500}
        rows={2}
        className="text-sm"
      />
      <Button
        type="button"
        size="sm"
        disabled={rating === 0 || isSubmitting}
        onClick={() => onSubmit(rating, comment.trim() || undefined)}
      >
        {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {submitLabel}
      </Button>
    </div>
  );
}
