import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function RatingTrendCard({ recent, previous }: { recent: number | null; previous: number | null }) {
  const hasTrend = recent != null && previous != null;
  const delta = hasTrend ? Math.round((recent - previous) * 100) / 100 : null;
  const TrendIcon = delta == null ? Minus : delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus;
  const color = delta == null
    ? "bg-gray-50 text-gray-400"
    : delta > 0.05
    ? "bg-brand-green-50 text-brand-green-600"
    : delta < -0.05
    ? "bg-red-50 text-red-600"
    : "bg-gray-50 text-gray-500";
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${color}`}>
        <TrendIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-gray-900 leading-tight sm:text-2xl">
          {recent != null ? recent.toFixed(1) : "—"}
          {delta != null && (
            <span className="ml-1 text-xs font-semibold text-gray-400">
              ({delta > 0 ? "+" : ""}
              {delta})
            </span>
          )}
        </p>
        <p className="text-xs leading-snug text-muted-foreground sm:text-sm">Note (30 derniers jours)</p>
      </div>
    </div>
  );
}
