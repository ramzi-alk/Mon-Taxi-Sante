import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

export interface CancelReasonPreset {
  value: string;
  label: string;
}

interface CancelReasonFormProps {
  presets: readonly CancelReasonPreset[];
  isSubmitting: boolean;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/**
 * Sélecteur de motif générique (chauffeur et patient) : une liste de presets
 * fournie par l'appelant, plus un choix "Autre" à texte libre. Partagé pour
 * que les deux flux d'annulation stockent un motif exploitable
 * (bookings.cancellation_reason) au lieu de rien — voir CancelReasonForm
 * chauffeur (RideCard.tsx, motif obligatoire depuis migration 057) et
 * CancelBookingAction côté patient.
 */
export function CancelReasonForm({
  presets,
  isSubmitting,
  confirmLabel = "Confirmer l'annulation",
  onConfirm,
  onClose,
}: CancelReasonFormProps) {
  const [preset, setPreset] = useState("");
  const [detail, setDetail] = useState("");

  const presetLabel = presets.find((r) => r.value === preset)?.label;
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
          {presets.map((r) => (
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
