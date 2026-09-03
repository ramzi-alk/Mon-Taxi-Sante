import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, ArrowRight, ClipboardList, ExternalLink, Loader2, UserCog, XCircle } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as adminBookingsRepository from "~/repositories/adminBookingsRepository";
import type { AdminBookingRow, EligibleDriver } from "~/repositories/adminBookingsRepository";
import {
  notifyBookingCancelledServerFn,
  notifyBookingAcceptedServerFn,
  notifyDriverRideAcceptedServerFn,
  notifyDriverReassignedAwayServerFn,
} from "~/server/email";
import { logger } from "~/lib/logger";
import { useRealtime } from "~/hooks/useRealtime";
import { useToast } from "~/components/ui/toast";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { STATUS_LABELS, STATUS_BADGE_CLASSES, isCancellable, type BookingStatus } from "~/lib/bookingStatus";
import { cn, formatDateFr, formatTimeFr, formatPrice, formatReferenceCode } from "~/lib/utils";

const PAGE_SIZE = 20;
const AT_RISK_HOURS = 4;

const bookingStatusValues = [
  "draft", "pending", "confirmed", "available", "accepted", "in_progress", "completed", "cancelled", "expired", "external_provider",
] as const;
const vehicleTypeValues = ["taxi", "vsl", "pmr", "ambulance"] as const;

const reservationsSearchSchema = z.object({
  bookingId: z.string().optional(),
  status: z.enum(bookingStatusValues).optional(),
  vehicleType: z.enum(vehicleTypeValues).optional(),
  q: z.string().optional(),
  page: z.number().int().min(0).optional().default(0),
});

export const Route = createFileRoute("/admin/reservations")({
  validateSearch: reservationsSearchSchema,
  head: () => ({
    meta: [{ title: "Réservations — Administration — Docteur Taxi" }],
  }),
  component: AdminReservationsPage,
});

function isAtRisk(booking: Pick<AdminBookingRow, "status" | "pickup_datetime">): boolean {
  if (booking.status !== "available") return false;
  const hoursUntilPickup = (new Date(booking.pickup_datetime).getTime() - Date.now()) / 36e5;
  return hoursUntilPickup <= AT_RISK_HOURS;
}

const VEHICLE_LABELS: Record<(typeof vehicleTypeValues)[number], string> = {
  taxi: "Taxi",
  vsl: "VSL",
  pmr: "PMR",
  ambulance: "Ambulance",
};

const TRIP_TYPE_LABELS: Record<AdminBookingRow["trip_type"], string> = {
  aller_simple: "Aller simple",
  aller_retour: "Aller-retour",
  multiple: "Trajets multiples",
};

function tripTypeSummary(
  booking: Pick<AdminBookingRow, "trip_type" | "return_datetime" | "series_index" | "series_total">
): string {
  const label = TRIP_TYPE_LABELS[booking.trip_type];
  if (booking.trip_type === "aller_retour" && booking.return_datetime) {
    return `${label} (retour ${formatTimeFr(booking.return_datetime)})`;
  }
  if (booking.trip_type === "multiple" && booking.series_index && booking.series_total) {
    return `${label} (${booking.series_index}/${booking.series_total})`;
  }
  return label;
}

function AdminReservationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [searchInput, setSearchInput] = useState(search.q ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (search.q ?? "")) {
        navigate({ search: (prev) => ({ ...prev, q: searchInput || undefined, page: 0 }) });
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const filters = { status: search.status, vehicleType: search.vehicleType, search: search.q };

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-bookings", filters.status, filters.vehicleType, filters.search, search.page],
    queryFn: () => adminBookingsRepository.fetchBookingsAdmin(supabase, filters, search.page, PAGE_SIZE),
  });

  useRealtime({ table: "bookings", queryKey: ["admin-bookings"] });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Réservations</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Référence, patient, téléphone…"
          className="sm:max-w-xs"
          aria-label="Rechercher une réservation"
        />
        <Select
          value={search.status ?? "all"}
          onValueChange={(v) =>
            navigate({ search: (prev) => ({ ...prev, status: v === "all" ? undefined : (v as BookingStatus), page: 0 }) })
          }
        >
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {bookingStatusValues.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={search.vehicleType ?? "all"}
          onValueChange={(v) =>
            navigate({ search: (prev) => ({ ...prev, vehicleType: v === "all" ? undefined : (v as typeof vehicleTypeValues[number]), page: 0 }) })
          }
        >
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Véhicule" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les véhicules</SelectItem>
            {vehicleTypeValues.map((v) => (
              <SelectItem key={v} value={v}>{VEHICLE_LABELS[v]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <AdminErrorState message="Impossible de charger les réservations." onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !data || data.rows.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucune réservation ne correspond à ces critères.
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards (a 6-column table doesn't fit a phone screen) */}
          <ul className="flex flex-col gap-2 sm:hidden">
            {data.rows.map((booking) => (
              <li key={booking.id}>
                <button
                  type="button"
                  onClick={() => navigate({ search: (prev) => ({ ...prev, bookingId: booking.id }) })}
                  className="w-full rounded-xl bg-white p-4 text-left ring-1 ring-gray-100 hover:ring-gray-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-gray-400">{formatReferenceCode(booking.reference_code)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_BADGE_CLASSES[booking.status])}>
                        {STATUS_LABELS[booking.status]}
                      </span>
                      {isAtRisk(booking) && <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />}
                    </div>
                  </div>
                  <p className="mt-1.5 font-semibold text-[#0B0F1C]">{booking.patient_full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateFr(booking.pickup_datetime)} à {formatTimeFr(booking.pickup_datetime)} · {VEHICLE_LABELS[booking.vehicle_type]} · {tripTypeSummary(booking)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Chauffeur : {booking.driver?.full_name ?? "—"}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block overflow-hidden rounded-xl ring-1 ring-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Référence</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Patient</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Date</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Véhicule</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Trajet</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Chauffeur</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => navigate({ search: (prev) => ({ ...prev, bookingId: booking.id }) })}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-gray-500">
                      {formatReferenceCode(booking.reference_code)}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{booking.patient_full_name}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDateFr(booking.pickup_datetime)}
                      <div className="text-xs text-gray-400">{formatTimeFr(booking.pickup_datetime)}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{VEHICLE_LABELS[booking.vehicle_type]}</td>
                    <td className="px-5 py-4 text-gray-500">{tripTypeSummary(booking)}</td>
                    <td className="px-5 py-4 text-gray-500">{booking.driver?.full_name ?? "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_BADGE_CLASSES[booking.status])}>
                          {STATUS_LABELS[booking.status]}
                        </span>
                        {isAtRisk(booking) && (
                          <span title="À risque : sans chauffeur, départ proche">
                            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-400">
              {data.total} réservation{data.total > 1 ? "s" : ""} — page {search.page + 1}/{totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={search.page <= 0}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page - 1 }) })}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Précédent
              </button>
              <button
                type="button"
                disabled={search.page + 1 >= totalPages}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      {search.bookingId && (
        <BookingDetailDialog
          bookingId={search.bookingId}
          onClose={() => navigate({ search: (prev) => ({ ...prev, bookingId: undefined }) })}
        />
      )}
    </div>
  );
}

// ─── Detail dialog ───────────────────────────────────────────────────────────

type DialogMode = "view" | "reassign" | "cancel" | "external";

function BookingDetailDialog({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<DialogMode>("view");
  const [cancelReason, setCancelReason] = useState("");

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-booking-detail", bookingId],
    queryFn: () => adminBookingsRepository.fetchBookingDetailAdmin(supabase, bookingId),
  });

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-at-risk-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", bookingId] });
  };

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: (reason: string) => adminBookingsRepository.adminCancelBooking(supabase, bookingId, reason),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Réservation annulée", variant: "success" });
      notifyBookingCancelledServerFn({ data: { bookingId } }).catch((err) => {
        logger.warn("email.notifyBookingCancelled failed", { error: err.message, bookingId });
      });
      setMode("view");
      setCancelReason("");
    },
    onError: () => toast({ title: "Échec de l'annulation", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const { mutate: assignDriver, isPending: isAssigning } = useMutation({
    mutationFn: (driverId: string) => adminBookingsRepository.adminAssignDriver(supabase, bookingId, driverId),
    onSuccess: (_, driverId) => {
      invalidateList();
      const previousDriverId = booking?.driver_id ?? null;
      toast({ title: previousDriverId ? "Chauffeur réassigné" : "Chauffeur assigné", variant: "success" });

      notifyBookingAcceptedServerFn({ data: { bookingId } }).catch((err) => {
        logger.warn("email.notifyBookingAccepted failed", { error: err.message, bookingId });
      });
      notifyDriverRideAcceptedServerFn({ data: { bookingId } }).catch((err) => {
        logger.warn("email.notifyDriverRideAccepted failed", { error: err.message, bookingId });
      });
      if (previousDriverId && previousDriverId !== driverId) {
        notifyDriverReassignedAwayServerFn({ data: { bookingId, previousDriverId } }).then((sent) => {
          if (!sent) {
            toast({
              title: "Ancien chauffeur non notifié",
              description: "La réassignation a réussi mais l'email n'a pas pu être envoyé au chauffeur précédent.",
              variant: "error",
            });
          }
        });
      }
      setMode("view");
    },
    onError: () => toast({ title: "Échec de l'assignation", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const { mutate: markExternalProvider, isPending: isMarkingExternal } = useMutation({
    mutationFn: () => adminBookingsRepository.adminMarkExternalProvider(supabase, bookingId),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Course marquée prise en charge par un prestataire externe", variant: "success" });
      setMode("view");
    },
    onError: () => toast({ title: "Échec de l'opération", description: "Réessayez dans un instant.", variant: "error" }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {isError ? (
          <AdminErrorState message="Impossible de charger cette réservation." onRetry={() => refetch()} />
        ) : isLoading || !booking ? (
          <p className="text-gray-400 py-8 text-center">Chargement…</p>
        ) : mode === "cancel" ? (
          <>
            <DialogHeader>
              <DialogTitle>Annuler cette réservation ?</DialogTitle>
              <DialogDescription>
                Le patient {booking.driver ? "et le chauffeur assigné " : ""}seront prévenus par email.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motif de l'annulation…"
              rows={3}
              aria-label="Motif de l'annulation"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setMode("view")}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
              <button
                type="button"
                disabled={isCancelling || cancelReason.trim().length === 0}
                onClick={() => cancelBooking(cancelReason.trim())}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {isCancelling ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </DialogFooter>
          </>
        ) : mode === "external" ? (
          <>
            <DialogHeader>
              <DialogTitle>Marquer comme prise en charge par un prestataire externe ?</DialogTitle>
              <DialogDescription>
                Cette course sortira du réseau Docteur Taxi{booking.driver ? " et le chauffeur assigné sera retiré" : ""}. Cette action est définitive.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setMode("view")}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
              <button
                type="button"
                disabled={isMarkingExternal}
                onClick={() => markExternalProvider()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {isMarkingExternal ? "Enregistrement…" : "Confirmer"}
              </button>
            </DialogFooter>
          </>
        ) : mode === "reassign" ? (
          <DriverPicker
            booking={booking}
            isAssigning={isAssigning}
            onBack={() => setMode("view")}
            onSelect={(driverId) => assignDriver(driverId)}
          />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{formatReferenceCode(booking.reference_code)}</DialogTitle>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_BADGE_CLASSES[booking.status])}>
                  {STATUS_LABELS[booking.status]}
                </span>
                {isAtRisk(booking) && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    À risque
                  </span>
                )}
              </div>
              <DialogDescription>
                Réservée le {formatDateFr(booking.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <DetailField label="Patient" value={booking.patient_full_name} />
              <DetailField label="Téléphone" value={booking.patient_phone} />
              {booking.patient_email && <DetailField label="Email" value={booking.patient_email} />}
              {booking.patient_birth_date && (
                <DetailField
                  label="Date de naissance"
                  value={format(parseISO(booking.patient_birth_date), "d MMMM yyyy", { locale: fr })}
                />
              )}
              <DetailField label="Départ" value={`${formatDateFr(booking.pickup_datetime)} à ${formatTimeFr(booking.pickup_datetime)}`} />
              <DetailField label="Adresse de départ" value={booking.pickup_address} />
              <DetailField label="Adresse d'arrivée" value={booking.dropoff_address} />
              <DetailField label="Véhicule" value={VEHICLE_LABELS[booking.vehicle_type]} />
              <DetailField label="Type de trajet" value={TRIP_TYPE_LABELS[booking.trip_type]} />
              {booking.trip_type === "aller_retour" && booking.return_datetime && (
                <DetailField
                  label="Retour"
                  value={`${formatDateFr(booking.return_datetime)} à ${formatTimeFr(booking.return_datetime)}`}
                />
              )}
              {booking.trip_type === "multiple" && booking.series_index && booking.series_total && (
                <DetailField label="Trajet de la série" value={`${booking.series_index} / ${booking.series_total}`} />
              )}
              {booking.passenger_count > 1 && (
                <DetailField label="Voyageurs" value={String(booking.passenger_count)} />
              )}
              {booking.is_hospitalization && <DetailField label="Contexte" value="Hospitalisation" />}
              <DetailField
                label="Équipements requis"
                value={
                  [
                    booking.requires_wheelchair && "Fauteuil roulant",
                    booking.requires_stretcher && "Brancard",
                    booking.requires_oxygen && "Oxygène",
                  ].filter(Boolean).join(", ") || "Aucun"
                }
              />
              <DetailField label="Chauffeur" value={booking.driver?.full_name ?? "Non assigné"} />
              <DetailField label="Prix estimé" value={booking.estimated_price != null ? formatPrice(booking.estimated_price) : "—"} />
              <DetailField label="Statut CPAM" value={booking.cpam_status} />
              {booking.mutual_name && <DetailField label="Mutuelle" value={booking.mutual_name} />}
              {booking.booking_for_other && (
                <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-2">Réservé par (pour un tiers)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {booking.booker_full_name && <DetailField label="Nom" value={booking.booker_full_name} />}
                    {booking.booker_phone && <DetailField label="Téléphone" value={booking.booker_phone} />}
                    {booking.booker_email && <DetailField label="Email" value={booking.booker_email} />}
                  </div>
                </div>
              )}
              <PmtField declared={booking.pmt_declared} filePath={booking.pmt_file_path} />
              {booking.medical_notes && (
                <div className="sm:col-span-2">
                  <DetailField label="Notes médicales" value={booking.medical_notes} />
                </div>
              )}
              {booking.cancellation_reason && (
                <div className="sm:col-span-2">
                  <DetailField label="Motif d'annulation" value={booking.cancellation_reason} />
                </div>
              )}
              {(booking.accepted_at || booking.picked_up_at || booking.completed_at) && (
                <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-2">Suivi de la course</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {booking.accepted_at && <DetailField label="Acceptée le" value={`${formatDateFr(booking.accepted_at)} à ${formatTimeFr(booking.accepted_at)}`} />}
                    {booking.picked_up_at && <DetailField label="Prise en charge le" value={`${formatDateFr(booking.picked_up_at)} à ${formatTimeFr(booking.picked_up_at)}`} />}
                    {booking.completed_at && <DetailField label="Terminée le" value={`${formatDateFr(booking.completed_at)} à ${formatTimeFr(booking.completed_at)}`} />}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {isCancellable(booking.status) && (
                <button
                  type="button"
                  onClick={() => setMode("cancel")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Annuler la course
                </button>
              )}
              {(booking.status === "available" || booking.status === "accepted" || booking.status === "expired") && (
                <button
                  type="button"
                  onClick={() => setMode("external")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 px-4 py-2.5 text-sm font-bold text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Prestataire externe
                </button>
              )}
              {(booking.status === "available" || booking.status === "accepted" || booking.status === "expired") && (
                <button
                  type="button"
                  onClick={() => setMode("reassign")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B0F1C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1244E8] transition-colors"
                >
                  <UserCog className="h-4 w-4" aria-hidden="true" />
                  {booking.driver ? "Réassigner un chauffeur" : "Assigner un chauffeur"}
                </button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 text-[#0B0F1C]">{value}</div>
    </div>
  );
}

function PmtField({ declared, filePath }: { declared: boolean; filePath: string | null }) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleView() {
    if (!filePath) return;
    setError(null);
    setIsOpening(true);
    try {
      const url = await adminBookingsRepository.getSignedPmtUrl(supabase, filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Impossible de générer le lien. Réessayez.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">PMT</div>
      <div className="mt-0.5 flex items-center gap-2 text-[#0B0F1C]">
        <span>{declared ? "Déclarée" : "Non déclarée"}</span>
        {filePath && (
          <button
            type="button"
            onClick={handleView}
            disabled={isOpening}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {isOpening ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-3 w-3" aria-hidden="true" />}
            Voir le document
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DriverPicker({
  booking,
  isAssigning,
  onBack,
  onSelect,
}: {
  booking: AdminBookingRow;
  isAssigning: boolean;
  onBack: () => void;
  onSelect: (driverId: string) => void;
}) {
  const { data: drivers, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-eligible-drivers", booking.id],
    queryFn: () => adminBookingsRepository.fetchEligibleDriversForBooking(supabase, booking),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{booking.driver ? "Réassigner un chauffeur" : "Assigner un chauffeur"}</DialogTitle>
        <DialogDescription>
          Chauffeurs approuvés et compatibles avec le véhicule/équipement requis pour cette course.
        </DialogDescription>
      </DialogHeader>

      {isError ? (
        <AdminErrorState message="Impossible de charger les chauffeurs disponibles." onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-gray-400 py-4 text-center">Chargement…</p>
      ) : !drivers || drivers.length === 0 ? (
        <p className="text-gray-400 py-4 text-center text-sm">Aucun chauffeur compatible n'est disponible actuellement.</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {drivers.map((driver: EligibleDriver) => (
            <li key={driver.profile_id}>
              <button
                type="button"
                disabled={isAssigning}
                onClick={() => onSelect(driver.profile_id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left hover:border-[#1244E8] hover:bg-brand-blue-50/40 disabled:opacity-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-[#0B0F1C]">{driver.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {VEHICLE_LABELS[driver.vehicle_type as keyof typeof VEHICLE_LABELS] ?? driver.vehicle_type} · {driver.vehicle_registration}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    driver.availability === "online"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {driver.availability === "online" ? "En ligne" : driver.availability === "paused" ? "En pause" : "Hors ligne"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DialogFooter>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Retour
        </button>
      </DialogFooter>
    </>
  );
}
