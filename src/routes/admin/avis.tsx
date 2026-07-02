import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquareText, EyeOff } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as adminRatingsRepository from "~/repositories/adminRatingsRepository";
import type { AdminRatingRow } from "~/repositories/adminRatingsRepository";
import { formatDateFr, formatReferenceCode, cn } from "~/lib/utils";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { useToast } from "~/components/ui/toast";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";

export const Route = createFileRoute("/admin/avis")({
  head: () => ({
    meta: [{ title: "Avis — Administration — Mon Taxi Santé" }],
  }),
  component: AdminAvisPage,
});

const RATING_FILTERS = [
  { value: "all", label: "Toutes les notes" },
  { value: "2", label: "2★ et moins" },
  { value: "3", label: "3★ et moins" },
] as const;

function AdminAvisPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [maxRating, setMaxRating] = useState<string>("all");

  const { data: ratings, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-ratings-moderation", maxRating],
    queryFn: () =>
      adminRatingsRepository.fetchRatingsForModeration(supabase, maxRating === "all" ? undefined : Number(maxRating)),
  });

  const { mutate: hide, isPending: isHiding } = useMutation({
    mutationFn: async (ratingId: string) => {
      const user = await authRepository.getCurrentUser(supabase);
      return adminRatingsRepository.hideRating(supabase, ratingId, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ratings-moderation"] });
      toast({ title: "Commentaire masqué", variant: "success" });
    },
    onError: () => toast({ title: "Échec du masquage", variant: "error" }),
  });

  const { mutate: unhide, isPending: isUnhiding } = useMutation({
    mutationFn: (ratingId: string) => adminRatingsRepository.unhideRating(supabase, ratingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ratings-moderation"] });
      toast({ title: "Commentaire réaffiché", variant: "success" });
    },
    onError: () => toast({ title: "Échec de la restauration", variant: "error" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
          <h1 className="text-xl font-bold text-[#0B0F1C]">Modération des avis</h1>
        </div>
        <Select value={maxRating} onValueChange={setMaxRating}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RATING_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <AdminErrorState message="Impossible de charger les avis." onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !ratings || ratings.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucun avis avec commentaire pour ces critères.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {ratings.map((rating) => (
            <RatingCard
              key={rating.id}
              rating={rating}
              onHide={() => hide(rating.id)}
              onUnhide={() => unhide(rating.id)}
              isPending={isHiding || isUnhiding}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingCard({
  rating,
  onHide,
  onUnhide,
  isPending,
}: {
  rating: AdminRatingRow;
  onHide: () => void;
  onUnhide: () => void;
  isPending: boolean;
}) {
  const isHidden = !!rating.hidden_at;
  const from = rating.rater_role === "patient" ? rating.booking?.patient_full_name : rating.booking?.driver?.full_name;
  const about = rating.rater_role === "patient" ? rating.booking?.driver?.full_name : rating.booking?.patient_full_name;

  return (
    <li className={cn("rounded-xl border p-4", isHidden ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0B0F1C]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              {rating.rating}/5
            </span>
            <span className="text-xs text-gray-400">
              {from ?? "—"} → {about ?? "—"}
            </span>
            <span className="font-mono text-xs text-gray-300">{formatReferenceCode(rating.booking?.reference_code ?? "")}</span>
            <span className="text-xs text-gray-300">{formatDateFr(rating.created_at)}</span>
            {isHidden && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">Masqué</span>
            )}
          </div>
          <p className={cn("mt-2 text-sm", isHidden ? "text-gray-400 italic" : "text-gray-700")}>{rating.comment}</p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={isHidden ? onUnhide : onHide}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50",
            isHidden ? "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100" : "bg-red-50 text-red-700 hover:bg-red-100"
          )}
        >
          {isHidden ? <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
          {isHidden ? "Réafficher" : "Masquer"}
        </button>
      </div>
    </li>
  );
}
