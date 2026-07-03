import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ClipboardList, Car, CheckCircle2, AlertTriangle, TimerOff, ArrowRight } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import * as adminBookingsRepository from "~/repositories/adminBookingsRepository";
import { useRealtime } from "~/hooks/useRealtime";
import { formatDateFr, formatTimeFr, formatReferenceCode } from "~/lib/utils";
import { AdminErrorState } from "~/components/admin/AdminErrorState";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Vue d'ensemble — Administration — Mon Taxi Santé" }],
  }),
  component: AdminOverviewPage,
});

// Same threshold as the SLA alert cron (see api/cron/at-risk-bookings.ts) —
// courses still unassigned this close to pickup need a human to step in.
const AT_RISK_HOURS = 4;

async function fetchBookingStats(): Promise<Record<string, number>> {
  return bookingsRepository.fetchBookingStatusCounts(supabase);
}

async function fetchAtRisk() {
  return adminBookingsRepository.fetchAtRiskBookings(supabase, AT_RISK_HOURS);
}

function AdminOverviewPage() {
  const {
    data: bookingStats,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-booking-stats"],
    queryFn: fetchBookingStats,
  });

  const {
    data: atRisk,
    isError: isAtRiskError,
    refetch: refetchAtRisk,
  } = useQuery({
    queryKey: ["admin-at-risk-bookings"],
    queryFn: fetchAtRisk,
  });

  useRealtime({ table: "bookings", queryKey: ["admin-booking-stats"] });
  useRealtime({ table: "bookings", queryKey: ["admin-at-risk-bookings"], filter: "status=eq.available" });

  const statCards = [
    { label: "En attente", value: bookingStats?.pending ?? 0, icon: Clock },
    { label: "Disponibles", value: bookingStats?.available ?? 0, icon: ClipboardList },
    { label: "En cours", value: bookingStats?.in_progress ?? 0, icon: Car },
    { label: "Terminées", value: bookingStats?.completed ?? 0, icon: CheckCircle2 },
    { label: "Expirées", value: bookingStats?.expired ?? 0, icon: TimerOff },
  ];

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0B0F1C]">
        Tableau de bord administrateur
      </h1>

      <div className="mt-10">
        {isStatsError ? (
          <AdminErrorState
            message="Impossible de charger les statistiques de réservations."
            onRetry={() => refetchStats()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
                <div className="flex items-center gap-2 text-gray-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                </div>
                <p className="mt-2 text-3xl font-black text-[#0B0F1C]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#0B0F1C]">
              À risque — sans chauffeur à moins de {AT_RISK_HOURS}h
            </h2>
          </div>
          <Link
            to="/admin/reservations"
            search={{ status: "available" }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1244E8] hover:underline"
          >
            Voir toutes les réservations
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isAtRiskError ? (
          <AdminErrorState
            message="Impossible de charger les courses à risque."
            onRetry={() => refetchAtRisk()}
          />
        ) : !atRisk || atRisk.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
            Aucune course à risque pour le moment.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-amber-100 bg-white">
            <ul className="divide-y divide-amber-50">
              {atRisk.map((booking) => (
                <li key={booking.id}>
                  <Link
                    to="/admin/reservations"
                    search={{ bookingId: booking.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-400">
                          {formatReferenceCode(booking.reference_code)}
                        </span>
                        <span className="font-semibold text-[#0B0F1C] truncate">
                          {booking.patient_full_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {booking.pickup_address} → {booking.dropoff_address}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                      {formatDateFr(booking.pickup_datetime)} à {formatTimeFr(booking.pickup_datetime)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
