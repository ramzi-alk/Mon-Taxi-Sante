import { StarRating } from "~/components/ui/star-rating";
import { RatingForm } from "~/components/booking/RatingForm";
import type { PoolRide } from "./RideCard";

// Notation du patient par le chauffeur — extrait de RideCard pour ne pas
// alourdir un composant déjà volumineux avec ce qui ne concerne que le
// statut "terminée".
interface CompletedRideExtrasProps {
  ride: PoolRide;
  onRate?: (rideId: string, rating: number, comment?: string) => void;
  isRating?: boolean;
}

export function CompletedRideExtras({ ride, onRate, isRating }: CompletedRideExtrasProps) {
  if (ride.driver_rating_given != null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-100">
        <span>Votre avis sur ce patient :</span>
        <StarRating value={ride.driver_rating_given} readOnly size="sm" />
      </div>
    );
  }

  if (!onRate) return null;

  return (
    <RatingForm
      prompt="Comment s'est passée cette course avec ce patient ?"
      submitLabel="Envoyer mon avis"
      isSubmitting={isRating}
      onSubmit={(rating, comment) => onRate(ride.id, rating, comment)}
    />
  );
}
