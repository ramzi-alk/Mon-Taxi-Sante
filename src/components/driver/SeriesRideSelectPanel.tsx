import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { formatDateFr, formatTimeFr, cn } from "~/lib/utils";
import type { PoolRide } from "./RideCard";

interface SeriesRideSelectPanelProps {
  rides: PoolRide[];
  mode: "accept" | "cancel";
  isSubmitting: boolean;
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

export function SeriesRideSelectPanel({
  rides,
  mode,
  isSubmitting,
  onConfirm,
  onClose,
}: SeriesRideSelectPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rides.map((r) => r.id))
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = selected.size;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">
        {mode === "accept"
          ? "Choisir les séances à accepter"
          : "Choisir les séances à annuler"}
      </p>

      <ul className="space-y-0.5">
        {rides.map((ride) => {
          const isToday =
            new Date(ride.pickup_datetime).toDateString() ===
            new Date().toDateString();
          const isTomorrow =
            new Date(ride.pickup_datetime).toDateString() ===
            new Date(Date.now() + 86400000).toDateString();
          const dayLabel = isToday
            ? "Auj."
            : isTomorrow
            ? "Dem."
            : formatDateFr(ride.pickup_datetime);
          return (
            <li key={ride.id}>
              <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer">
                <Checkbox
                  checked={selected.has(ride.id)}
                  onCheckedChange={() => toggle(ride.id)}
                  disabled={isSubmitting}
                  aria-label={`${dayLabel} ${formatTimeFr(ride.pickup_datetime)}`}
                />
                <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                  {dayLabel}
                </span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTimeFr(ride.pickup_datetime)}
                </span>
                {ride.series_index != null && (
                  <span className="ml-auto text-[10px] text-gray-400 whitespace-nowrap">
                    #{ride.series_index}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {count}/{rides.length} sélectionnée{count > 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-gray-500 hover:underline disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Array.from(selected))}
            disabled={isSubmitting || count === 0}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-60",
              mode === "accept"
                ? "bg-brand-green-600 hover:bg-brand-green-700"
                : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isSubmitting && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            )}
            {mode === "accept" ? `Accepter ${count}` : `Annuler ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
