import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Minus,
  Download,
  MapPin,
  Phone,
} from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as adminStatsRepository from "~/repositories/adminStatsRepository";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { downloadCsv } from "~/lib/csv";
import { CPAM_LABELS } from "~/lib/cpam";
import { VEHICLE_LABELS } from "~/lib/vehicle";
import { formatDateFr, formatTimeFr, formatPrice, formatReferenceCode } from "~/lib/utils";
import { Input } from "~/components/ui/input";

export const Route = createFileRoute("/admin/statistiques")({
  head: () => ({
    meta: [{ title: "Statistiques — Administration — Docteur Taxi" }],
  }),
  component: AdminStatistiquesPage,
});

const WINDOW_OPTIONS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
] as const;

function Trend({ current, previous, lowerIsBetter = false }: { current: number | null; previous: number | null; lowerIsBetter?: boolean }) {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
        <Minus className="h-3 w-3" aria-hidden="true" /> stable
      </span>
    );
  }
  const isImprovement = lowerIsBetter ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${isImprovement ? "text-emerald-600" : "text-red-600"}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {delta > 0 ? "+" : ""}
      {delta.toFixed(1)} pts vs période précédente
    </span>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  trend,
}: {
  label: string;
  value: string;
  suffix?: string;
  trend?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#0B0F1C]">
        {value}
        {suffix && <span className="text-base font-bold text-gray-400"> {suffix}</span>}
      </p>
      {trend && <div className="mt-1">{trend}</div>}
    </div>
  );
}

function KpiSection() {
  const [days, setDays] = useState<7 | 30>(7);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-operational-kpis", days],
    queryFn: () => adminStatsRepository.fetchOperationalKpis(supabase, days),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
          <h1 className="text-xl font-bold text-[#0B0F1C]">KPIs opérationnels</h1>
        </div>
        <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-gray-100">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                days === opt.days ? "bg-[#0B0F1C] text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <AdminErrorState message="Impossible de charger les statistiques." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <p className="text-gray-400">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Courses (période)" value={String(data.current.total_bookings)} />
            <KpiCard
              label="Taux d'annulation"
              value={data.current.cancellation_rate !== null ? `${data.current.cancellation_rate}` : "—"}
              suffix="%"
              trend={<Trend current={data.current.cancellation_rate} previous={data.previous.cancellation_rate} lowerIsBetter />}
            />
            <KpiCard
              label="Courses sans chauffeur"
              value={data.current.unassigned_rate !== null ? `${data.current.unassigned_rate}` : "—"}
              suffix="%"
              trend={<Trend current={data.current.unassigned_rate} previous={data.previous.unassigned_rate} lowerIsBetter />}
            />
            <KpiCard
              label="Délai moyen d'attribution"
              value={data.current.avg_assignment_minutes !== null ? `${data.current.avg_assignment_minutes}` : "—"}
              suffix="min"
              trend={<Trend current={data.current.avg_assignment_minutes} previous={data.previous.avg_assignment_minutes} lowerIsBetter />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <KpiCard
              label="Note moyenne (patients → chauffeurs)"
              value={data.current.avg_rating !== null ? `${data.current.avg_rating}` : "—"}
              suffix={data.current.rating_count > 0 ? `/5 (${data.current.rating_count} avis)` : "/5"}
            />
            <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Répartition géographique
                </span>
              </div>
              {data.by_municipality.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune donnée sur la période.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {data.by_municipality.map((m) => (
                    <li key={m.municipality} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{m.municipality}</span>
                      <span className="font-bold text-[#0B0F1C]">{m.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const CALL_SOURCE_LABELS: Record<string, string> = {
  navbar: "Menu (haut de page)",
  footer: "Pied de page",
  booking_form_help: "Aide au formulaire de réservation",
  error_boundary: "Écran d'erreur",
  home_hero: "Accueil — bandeau principal",
  home_bottom_cta: "Accueil — bas de page",
  city_page: "Pages villes",
  hospital_page: "Pages hôpitaux",
  ald_page: "Pages ALD",
  faq: "FAQ",
  my_bookings: "Mes réservations",
  booking_confirmation: "Confirmation de réservation",
};

function CallClicksSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-call-click-stats"],
    queryFn: () => adminStatsRepository.fetchCallClickStats(supabase),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Phone className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h2 className="text-xl font-bold text-[#0B0F1C]">Clics sur "Appeler"</h2>
      </div>

      {isError ? (
        <AdminErrorState message="Impossible de charger les statistiques d'appel." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <p className="text-gray-400">Chargement…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Total (depuis le lancement)" value={String(data.total)} />
          <KpiCard label="30 derniers jours" value={String(data.last_30_days)} />
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Par emplacement
            </p>
            {data.by_source.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun clic enregistré pour le moment.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.by_source.map((s) => (
                  <li key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{CALL_SOURCE_LABELS[s.source] ?? s.source}</span>
                    <span className="font-bold text-[#0B0F1C]">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function ExportSection() {
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: runExport, isPending } = useMutation({
    mutationFn: async () => {
      const rows = await adminStatsRepository.fetchCpamExportRows(supabase, {
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      });
      return rows;
    },
    onSuccess: (rows) => {
      if (rows.length === 0) {
        setErrorMessage("Aucune course terminée sur cette période.");
        return;
      }
      setErrorMessage(null);
      downloadCsv(
        `courses-terminees_${from}_${to}.csv`,
        [
          "Référence",
          "Patient",
          "Prise en charge",
          "Destination",
          "Date de prise en charge",
          "Date de fin",
          "Distance (km)",
          "Véhicule",
          "Statut mutuelle",
          "Nom mutuelle",
          "Retour à vide (hospitalisation)",
          "Montant (€)",
          "Chauffeur",
        ],
        rows.map((r) => [
          formatReferenceCode(r.reference_code),
          r.patient_full_name,
          r.pickup_address,
          r.dropoff_address,
          `${formatDateFr(r.pickup_datetime)} ${formatTimeFr(r.pickup_datetime)}`,
          r.completed_at ? `${formatDateFr(r.completed_at)} ${formatTimeFr(r.completed_at)}` : "",
          r.distance_km !== null ? String(r.distance_km) : "",
          VEHICLE_LABELS[r.vehicle_type] ?? r.vehicle_type,
          CPAM_LABELS[r.cpam_status] ?? r.cpam_status,
          r.mutual_name ?? "",
          r.is_hospitalization ? "oui" : "non",
          r.estimated_price !== null ? formatPrice(r.estimated_price) : "",
          r.driver_full_name ?? "",
        ])
      );
    },
    onError: () => setErrorMessage("Impossible de générer l'export. Réessayez."),
  });

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-sm font-bold text-[#0B0F1C] mb-1">Export comptabilité / CPAM</h2>
      <p className="text-sm text-gray-500 mb-4">
        Courses terminées sur la période choisie, avec tarif, distance et statut de prise en
        charge — au format CSV, compatible Excel.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="export-from" className="block text-xs font-semibold text-gray-700">
            Du
          </label>
          <Input
            id="export-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="export-to" className="block text-xs font-semibold text-gray-700">
            Au
          </label>
          <Input
            id="export-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
        <button
          type="button"
          onClick={() => runExport()}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0B0F1C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Génération…" : "Télécharger le CSV"}
        </button>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function AdminStatistiquesPage() {
  return (
    <div className="flex flex-col gap-10">
      <KpiSection />
      <CallClicksSection />
      <ExportSection />
    </div>
  );
}
