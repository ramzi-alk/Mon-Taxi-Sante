import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { UserSearch, Phone, Mail, Calendar } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as adminPatientsRepository from "~/repositories/adminPatientsRepository";
import type { AdminPatientRow } from "~/repositories/adminPatientsRepository";
import { STATUS_LABELS, STATUS_BADGE_CLASSES, type BookingStatus } from "~/lib/bookingStatus";
import { formatDateFr, formatTimeFr, formatReferenceCode, cn } from "~/lib/utils";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { Input } from "~/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";

const patientsSearchSchema = z.object({
  patientId: z.string().optional(),
});

export const Route = createFileRoute("/admin/patients")({
  validateSearch: patientsSearchSchema,
  head: () => ({
    meta: [{ title: "Patients — Administration — Mon Taxi Santé" }],
  }),
  component: AdminPatientsPage,
});

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function AdminPatientsPage() {
  const { patientId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-search-patients", debouncedQuery],
    queryFn: () => adminPatientsRepository.searchPatients(supabase, debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <UserSearch className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Patients</h1>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nom, téléphone ou email…"
        className="max-w-sm mb-5"
        aria-label="Rechercher un patient"
      />

      {debouncedQuery.trim().length < 2 ? (
        <p className="text-sm text-gray-400">Tapez au moins 2 caractères pour rechercher un patient.</p>
      ) : isError ? (
        <AdminErrorState message="Impossible de rechercher les patients." onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-gray-400">Recherche…</p>
      ) : !results || results.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucun patient ne correspond à cette recherche.
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="flex flex-col gap-2 sm:hidden">
            {results.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => navigate({ search: { patientId: patient.id } })}
                  className="w-full rounded-xl bg-white p-4 text-left ring-1 ring-gray-100 hover:ring-gray-200 transition-colors"
                >
                  <p className="font-semibold text-[#0B0F1C]">{patient.full_name}</p>
                  {patient.phone && <p className="text-xs text-gray-500 mt-0.5">{patient.phone}</p>}
                  {patient.email && <p className="text-xs text-gray-500">{patient.email}</p>}
                  <p className="text-xs text-gray-400 mt-1">Compte créé le {formatDateFr(patient.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block overflow-hidden rounded-xl ring-1 ring-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Nom</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Téléphone</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Email</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Compte créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => navigate({ search: { patientId: patient.id } })}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{patient.full_name}</td>
                    <td className="px-5 py-4 text-gray-500">{patient.phone ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-500">{patient.email ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDateFr(patient.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {patientId && (
        <PatientFicheDialog
          patient={results?.find((p) => p.id === patientId) ?? null}
          patientId={patientId}
          onClose={() => navigate({ search: { patientId: undefined } })}
        />
      )}
    </div>
  );
}

function PatientFicheDialog({
  patient,
  patientId,
  onClose,
}: {
  patient: AdminPatientRow | null;
  patientId: string;
  onClose: () => void;
}) {
  const { data: bookings, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-patient-bookings", patientId],
    queryFn: () => adminPatientsRepository.fetchPatientBookings(supabase, patientId),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient?.full_name ?? "Fiche patient"}</DialogTitle>
          <DialogDescription>
            {patient?.email && (
              <span className="inline-flex items-center gap-1 mr-3"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{patient.email}</span>
            )}
            {patient?.phone && (
              <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{patient.phone}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[#0B0F1C]">Historique de réservations</h3>
          </div>

          {isError ? (
            <AdminErrorState message="Impossible de charger l'historique." onRetry={() => refetch()} />
          ) : isLoading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : !bookings || bookings.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune réservation pour ce patient.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {bookings.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-400">
                        {formatReferenceCode(booking.reference_code)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDateFr(booking.pickup_datetime)} à {formatTimeFr(booking.pickup_datetime)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {booking.pickup_address} → {booking.dropoff_address}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      STATUS_BADGE_CLASSES[booking.status as BookingStatus]
                    )}
                  >
                    {STATUS_LABELS[booking.status as BookingStatus]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
