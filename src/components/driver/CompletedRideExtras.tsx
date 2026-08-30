import { useState } from "react";
import { Banknote, Check, Download, Loader2, Pencil } from "lucide-react";
import { StarRating } from "~/components/ui/star-rating";
import { RatingForm } from "~/components/booking/RatingForm";
import { Input } from "~/components/ui/input";
import type { PoolRide } from "./RideCard";

// Regroupe tout ce qui est spécifique à une course *terminée* (notation +
// Sprint 4 : CA réel ajustable, justificatif PDF) — extrait de RideCard pour
// ne pas continuer à alourdir un composant déjà volumineux à chaque nouvelle
// fonctionnalité qui ne concerne que ce statut.
interface CompletedRideExtrasProps {
  ride: PoolRide;
  onRate?: (rideId: string, rating: number, comment?: string) => void;
  isRating?: boolean;
  onSetActualPrice?: (rideId: string, amount: number) => void;
  isSettingActualPrice?: boolean;
  onDownloadReceipt?: (ride: PoolRide) => void;
}

function ActualPriceEditor({
  ride,
  onSetActualPrice,
  isSettingActualPrice,
}: {
  ride: PoolRide;
  onSetActualPrice?: (rideId: string, amount: number) => void;
  isSettingActualPrice?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() =>
    (ride.actual_price ?? ride.estimated_price ?? 0).toFixed(2)
  );

  if (!onSetActualPrice) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full bg-gray-50 hover:bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700 transition-colors"
      >
        <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
        {ride.actual_price != null ? (
          <>{ride.actual_price.toFixed(2).replace(".", ",")} € <span className="font-normal text-gray-400">réel</span></>
        ) : (
          <>Saisir le tarif réel <Pencil className="h-3 w-3" aria-hidden="true" /></>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-24 px-2 py-1 text-xs"
        aria-label="Tarif réellement facturé"
        autoFocus
      />
      <button
        type="button"
        onClick={() => {
          const amount = Number(value);
          if (!Number.isNaN(amount) && amount >= 0) onSetActualPrice(ride.id, amount);
          setEditing(false);
        }}
        disabled={isSettingActualPrice}
        className="flex items-center justify-center rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 p-1.5 text-white disabled:opacity-60 transition-colors"
        aria-label="Enregistrer le tarif réel"
      >
        {isSettingActualPrice ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function CompletedRideExtras({
  ride,
  onRate,
  isRating,
  onSetActualPrice,
  isSettingActualPrice,
  onDownloadReceipt,
}: CompletedRideExtrasProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <ActualPriceEditor ride={ride} onSetActualPrice={onSetActualPrice} isSettingActualPrice={isSettingActualPrice} />
        {onDownloadReceipt && (
          <button
            type="button"
            onClick={() => onDownloadReceipt(ride)}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue-700 hover:underline"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Justificatif de transport (PDF)
          </button>
        )}
      </div>

      {ride.driver_rating_given != null ? (
        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-100">
          <span>Votre avis sur ce patient :</span>
          <StarRating value={ride.driver_rating_given} readOnly size="sm" />
        </div>
      ) : (
        onRate && (
          <RatingForm
            prompt="Comment s'est passée cette course avec ce patient ?"
            submitLabel="Envoyer mon avis"
            isSubmitting={isRating}
            onSubmit={(rating, comment) => onRate(ride.id, rating, comment)}
          />
        )
      )}
    </>
  );
}
