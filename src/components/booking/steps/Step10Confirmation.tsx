import { UseFormReturn } from "react-hook-form";
import {
  CheckCircle2,
  User,
  MapPin,
  Calendar,
  Car,
  ShieldCheck,
  FileText,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { formatDateFr, formatPrice, combineLocalDateTimeToIso } from "~/lib/utils";
import { computeSeriesDates } from "~/lib/seriesSchedule";
import { calculatePrice, departementDepuisAdresse } from "~/lib/pricing";
import { VEHICLE_LABELS } from "~/lib/vehicle";
import { CPAM_LABELS } from "~/lib/cpam";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
  isSubmitting: boolean;
  submitError?: string | null;
}

const tripTypeLabels: Record<string, string> = {
  aller_simple: "Aller simple",
  aller_retour: "Aller-retour",
  multiple: "Trajets en série",
};

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function Step10Confirmation({ form, isSubmitting, submitError }: StepProps) {
  const { register, formState: { errors } } = form;
  const data = form.getValues();

  const pickupDatetime = data.pickup_date && data.pickup_time
    ? `${formatDateFr(data.pickup_date)} à ${data.pickup_time}`
    : "—";

  // Estimation affichée uniquement pour les patients sans couverture
  // Assurance Maladie (cpam_status "none") : dans ce cas partPatient === total
  // (taux CPAM 0%), donc pas besoin du détail de répartition. Reprend
  // exactement la formule du trigger DB compute_booking_price (migration
  // 026) pour rester cohérente avec estimated_price une fois la réservation
  // créée — voir src/lib/pricing.ts.
  const priceEstimate = (() => {
    if (data.cpam_status !== "none" || data.distance_km == null || !data.pickup_address) {
      return null;
    }
    const codeDepartement = departementDepuisAdresse(data.pickup_address);
    if (!codeDepartement) return null;
    return calculatePrice({
      distanceKm: data.distance_km,
      codeDepartement,
      adresseDepart: data.pickup_address,
      adresseArrivee: data.dropoff_address ?? "",
      pickupDatetime:
        data.pickup_date && data.pickup_time
          ? combineLocalDateTimeToIso(data.pickup_date, data.pickup_time)
          : new Date().toISOString(),
      cpamStatus: "none",
      retourAVide: data.is_hospitalization,
      tpmr: data.requires_wheelchair,
    });
  })();

  const specificities = [
    data.requires_wheelchair && "Fauteuil roulant",
    data.requires_stretcher && "Brancard",
    data.requires_oxygen && "Oxygène",
  ]
    .filter(Boolean)
    .join(", ") || "Aucun";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Récapitulatif de votre réservation
        </h2>
        <p className="mt-1 text-muted-foreground">
          Vérifiez toutes les informations avant de confirmer.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-brand-blue-600 px-5 py-4 text-white">
          <p className="text-sm font-medium opacity-80">Transport médical Assurance Maladie</p>
          <p className="text-lg font-bold mt-0.5">
            {data.pickup_address?.split(",")[0]} →{" "}
            {data.dropoff_address?.split(",")[0]}
          </p>
        </div>

        {/* Details */}
        <div className="px-5">
          <SummaryRow icon={User} label="Patient" value={data.patient_full_name || "—"} />
          <SummaryRow icon={User} label="Tél. patient" value={data.patient_phone || "—"} />
          {data.booking_for_other ? (
            <>
              <SummaryRow icon={User} label="Réservé par" value={data.booker_full_name || "Vous (proche)"} />
              <SummaryRow icon={User} label="Votre email" value={data.booker_email || "—"} />
              <SummaryRow icon={User} label="Votre tél." value={data.booker_phone || "—"} />
            </>
          ) : (
            <SummaryRow icon={User} label="Email" value={data.patient_email || "—"} />
          )}
          <SummaryRow icon={MapPin} label="Départ" value={data.pickup_address || "—"} />
          <SummaryRow icon={MapPin} label="Destination" value={data.dropoff_address || "—"} />
          <SummaryRow icon={Calendar} label="Date & heure" value={pickupDatetime} />
          <SummaryRow icon={Car} label="Véhicule" value={VEHICLE_LABELS[data.vehicle_type] ?? "—"} />
          <SummaryRow icon={Car} label="Type de trajet" value={tripTypeLabels[data.trip_type] ?? "—"} />
          <SummaryRow
            icon={AlertCircle}
            label="Besoins spécifiques"
            value={specificities}
          />
          <SummaryRow
            icon={ShieldCheck}
            label="Prise en charge"
            value={CPAM_LABELS[data.cpam_status] ?? "—"}
          />
          <SummaryRow
            icon={FileText}
            label="PMT"
            value={
              data.pmt_declared
                ? data.pmt_file
                  ? `Document joint : ${(data.pmt_file as File).name}`
                  : "Déclarée — document à fournir"
                : "Non déclarée"
            }
          />
        </div>
      </div>

      {/* Série sans PMT : seule la 1ère séance sera réellement réservée —
          avertissement répété ici (voir aussi Step5TripType et la page de
          confirmation) pour qu'il reste visible jusqu'au dernier écran avant
          l'envoi, quel que soit le nombre de séances configurées plus haut. */}
      {data.trip_type === "multiple" && !data.pmt_declared && (() => {
        const plannedDates =
          data.series_days_of_week?.length && data.series_duration_weeks
            ? computeSeriesDates(data.pickup_date, data.series_days_of_week, data.series_duration_weeks)
            : [];
        if (plannedDates.length <= 1) return null;
        return (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl bg-amber-50 border-2 border-amber-300 p-4"
          >
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-amber-900">
              <p className="font-bold">
                Une seule séance sera réservée, pas {plannedDates.length}
              </p>
              <p className="mt-0.5 leading-relaxed">
                Vous avez planifié {plannedDates.length} séances, mais sans PMT
                déclarée seule la 1ère (le {formatDateFr(plannedDates[0])}) sera
                effectivement enregistrée. Transmettez votre PMT dès que possible
                puis renouvelez votre réservation pour planifier les séances
                suivantes.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Le Tiers-Payant ne s'applique qu'aux trajets pris en charge par
          l'Assurance Maladie — pour "Sans couverture" (frais personnels),
          afficher plutôt l'estimation de tarif promise à l'étape "Prise en
          charge" ("le tarif exact vous sera communiqué avant la confirmation
          de votre réservation"), au lieu de la promesse "zéro avance de
          frais" qui serait fausse dans ce cas. */}
      {data.cpam_status === "none" ? (
        priceEstimate ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
              <p className="font-semibold text-amber-900">
                Estimation du tarif à votre charge
              </p>
            </div>
            <p className="mt-1.5 text-2xl font-black text-amber-900">
              {formatPrice(priceEstimate.total)}
            </p>
            <p className="mt-1.5 text-sm text-amber-700 leading-relaxed">
              Calculée selon la distance, votre département et l&apos;heure du
              trajet (convention nationale taxi 2025). Le tarif définitif est
              confirmé par le chauffeur à la prise en charge.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            Le tarif exact vous sera communiqué par le chauffeur avant la prise
            en charge — aucune estimation n&apos;a pu être calculée pour ce
            trajet.
          </div>
        )
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-brand-green-50 border border-brand-green-100 p-4">
          <CheckCircle2 className="h-5 w-5 text-brand-green-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-brand-green-900">
            <p className="font-semibold">Zéro avance de frais — Tiers-Payant</p>
            <p className="mt-0.5">
              Vous ne paierez rien le jour du transport. L&apos;Assurance Maladie règle
              directement le chauffeur via le Tiers-Payant.
            </p>
          </div>
        </div>
      )}

      {/* Terms */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            {...register("consent")}
            className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500 cursor-pointer"
            aria-required="true"
            aria-invalid={!!errors.consent}
          />
          <span className="text-sm text-gray-700">
            J&apos;accepte les{" "}
            <a href="/cgv" target="_blank" className="text-brand-blue-600 underline">
              Conditions Générales de Vente
            </a>{" "}
            et la{" "}
            <a href="/confidentialite" target="_blank" className="text-brand-blue-600 underline">
              Politique de confidentialité
            </a>
            .{" "}
            {data.booking_for_other
              ? "Je confirme que les informations médicales fournies pour le patient sont exactes au meilleur de ma connaissance et que j'ai son accord pour effectuer cette réservation en son nom."
              : "Je confirme que les informations médicales fournies sont exactes."}
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {errors.consent.message}
          </p>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {submitError}
        </div>
      )}

      {/* Submit button — extra large for accessibility */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full rounded-2xl bg-brand-blue-600 px-8 py-5 text-xl font-bold text-white shadow-lg shadow-brand-blue-600/20 hover:bg-brand-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-3">
            <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
            Confirmation en cours…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            Confirmer ma réservation
          </span>
        )}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Vous recevrez une confirmation par email dans les minutes qui suivent.
      </p>
    </div>
  );
}
