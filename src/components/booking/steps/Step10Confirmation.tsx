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
} from "lucide-react";
import { formatDateFr } from "~/lib/utils";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
  isSubmitting: boolean;
}

const vehicleLabels: Record<string, string> = {
  taxi: "Taxi conventionné",
  vsl: "VSL",
  pmr: "Taxi PMR (Handicap)",
};

const tripTypeLabels: Record<string, string> = {
  aller_simple: "Aller simple",
  aller_retour: "Aller-retour",
  multiple: "Trajets en série",
};

const cpamLabels: Record<string, string> = {
  ald: "ALD — 100% Sécurité Sociale",
  cmu: "CMU-C — Prise en charge totale",
  css: "CSS — Prise en charge totale",
  standard: "Assuré standard (65% SS)",
  none: "Frais personnels",
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

export function Step10Confirmation({ form, isSubmitting }: StepProps) {
  const { register, formState: { errors } } = form;
  const data = form.getValues();

  const pickupDatetime = data.pickup_date && data.pickup_time
    ? `${formatDateFr(data.pickup_date)} à ${data.pickup_time}`
    : "—";

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
          <SummaryRow icon={User} label="Téléphone" value={data.patient_phone || "—"} />
          <SummaryRow icon={MapPin} label="Départ" value={data.pickup_address || "—"} />
          <SummaryRow icon={MapPin} label="Destination" value={data.dropoff_address || "—"} />
          <SummaryRow icon={Calendar} label="Date & heure" value={pickupDatetime} />
          <SummaryRow icon={Car} label="Véhicule" value={vehicleLabels[data.vehicle_type] ?? "—"} />
          <SummaryRow icon={Car} label="Type de trajet" value={tripTypeLabels[data.trip_type] ?? "—"} />
          <SummaryRow
            icon={AlertCircle}
            label="Besoins spécifiques"
            value={specificities}
          />
          <SummaryRow
            icon={ShieldCheck}
            label="Prise en charge"
            value={cpamLabels[data.cpam_status] ?? "—"}
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

      {/* Zero advance notice */}
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
            . Je confirme que les informations médicales fournies sont exactes.
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {errors.consent.message}
          </p>
        )}
      </div>

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

      <p className="text-center text-xs text-muted-foreground">
        Vous recevrez une confirmation par SMS et email dans les minutes qui suivent.
      </p>
    </div>
  );
}
