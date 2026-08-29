import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const REASON_PRESETS = [
  { value: "patient_a_annule", label: "Le patient a annulé / m'a prévenu" },
  { value: "erreur_acceptation", label: "Erreur d'acceptation" },
  { value: "imprevu_vehicule", label: "Imprévu véhicule" },
  { value: "autre", label: "Autre" },
] as const;

interface CancelReasonFormProps {
  isSubmitting: boolean;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// Motif obligatoire depuis migration 057 (cancel_ride_by_driver) : la
// détection d'annulation suspecte reste purement temporelle côté serveur,
// mais ce motif est désormais stocké (bookings.cancellation_reason) pour que
// l'admin puisse arbitrer une suspension de pool plutôt que la déclencher à
// l'aveugle sur un simple minuteur.
export function CancelReasonForm({
  isSubmitting,
  confirmLabel = "Confirmer l'annulation",
  onConfirm,
  onClose,
}: CancelReasonFormProps) {
  const [preset, setPreset] = useState("");
  const [detail, setDetail] = useState("");

  const presetLabel = REASON_PRESETS.find((r) => r.value === preset)?.label;
  const reason = preset === "autre" ? detail.trim() : presetLabel ?? "";
  const canConfirm = preset !== "" && (preset !== "autre" || detail.trim().length > 0);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-red-800">Motif de l'annulation (obligatoire)</p>

      <Select value={preset} onValueChange={setPreset}>
        <SelectTrigger aria-label="Motif de l'annulation" className="bg-white">
          <SelectValue placeholder="Choisir un motif" />
        </SelectTrigger>
        <SelectContent>
          {REASON_PRESETS.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "autre" && (
        <Textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Précisez le motif…"
          rows={2}
          aria-label="Détail du motif"
          className="bg-white"
        />
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => canConfirm && onConfirm(reason)}
          disabled={isSubmitting || !canConfirm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="text-xs text-gray-500 hover:underline disabled:opacity-60"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
