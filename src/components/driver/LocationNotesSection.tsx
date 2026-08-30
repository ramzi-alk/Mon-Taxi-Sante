import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { supabase } from "~/lib/supabase";
import { formatDateFr } from "~/lib/utils";
import { getLocationNotes, addLocationNote } from "~/repositories/bookingsRepository";

interface LocationNotesSectionProps {
  rideId: string;
}

// Notes factuelles non identifiantes sur le lieu de prise en charge (migration
// 065) — chargées à la demande (repliées par défaut) plutôt que pour chaque
// course affichée, pour éviter un appel RPC par carte au montage. Composant
// autonome (requête/mutation propres) car cette donnée est locale à une
// course et n'a pas besoin d'invalider les queries pool/mes courses du parent.
export function LocationNotesSection({ rideId }: LocationNotesSectionProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["location-notes", rideId],
    queryFn: () => getLocationNotes(supabase, rideId),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (text: string) => addLocationNote(supabase, rideId, text),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["location-notes", rideId] });
    },
  });

  const trimmed = note.trim();

  return (
    <div className="pt-2 border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Notes sur ce lieu (accès, stationnement…)
        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl bg-sky-50/60 border border-sky-100 p-3">
          {notesQuery.isLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Chargement…
            </p>
          ) : notesQuery.data && notesQuery.data.length > 0 ? (
            <ul className="space-y-1.5">
              {notesQuery.data.map((n, i) => (
                <li key={i} className="text-xs text-gray-700">
                  <span className="text-gray-400">{formatDateFr(n.created_at)} —</span> {n.note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Aucune note pour ce lieu pour l'instant.</p>
          )}

          <div className="flex items-start gap-1.5 pt-1">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : étage sans ascenseur, stationnement difficile…"
              rows={2}
              maxLength={200}
              aria-label="Ajouter une note sur ce lieu"
              className="bg-white text-xs"
            />
            <button
              type="button"
              onClick={() => trimmed && addMutation.mutate(trimmed)}
              disabled={!trimmed || addMutation.isPending}
              aria-label="Envoyer la note"
              className="flex shrink-0 items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-700 p-2 text-white disabled:opacity-60 transition-colors"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
