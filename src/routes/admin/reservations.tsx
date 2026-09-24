import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  ExternalLink,
  History,
  Layers,
  Loader2,
  Mail,
  MailCheck,
  Plus,
  RotateCcw,
  StickyNote,
  UserCog,
  XCircle,
} from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as adminBookingsRepository from "~/repositories/adminBookingsRepository";
import type { AdminBookingRow, EligibleDriver } from "~/repositories/adminBookingsRepository";
import * as adminActivityRepository from "~/repositories/adminActivityRepository";
import * as authRepository from "~/repositories/authRepository";
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
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "~/components/ui/alert-dialog";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { STATUS_LABELS, STATUS_BADGE_CLASSES, isCancellable, type BookingStatus } from "~/lib/bookingStatus";
import { CPAM_LABELS } from "~/lib/cpam";
import { downloadCsv } from "~/lib/csv";
import { cn, formatDateFr, formatTimeFr, formatPrice, formatReferenceCode } from "~/lib/utils";

const PAGE_SIZE = 20;
const AT_RISK_HOURS = 4;

const bookingStatusValues = [
  "draft", "pending", "confirmed", "available", "accepted", "in_progress", "completed", "cancelled", "expired", "external_provider",
] as const;
const vehicleTypeValues = ["taxi", "vsl", "pmr", "ambulance"] as const;
const cpamStatusValues = ["ald", "cmu", "css", "standard", "none"] as const;
const paymentStatusValues = ["non_facture", "facture", "encaisse", "sans_objet"] as const;

const CPAM_SHORT_LABELS: Record<(typeof cpamStatusValues)[number], string> = {
  ald: "ALD",
  cmu: "CMU-C",
  css: "CSS",
  standard: "Standard",
  none: "Perso",
};

const PAYMENT_STATUS_LABELS: Record<(typeof paymentStatusValues)[number], string> = {
  non_facture: "À facturer",
  facture: "Facturée",
  encaisse: "Encaissée",
  sans_objet: "Sans objet",
};

const PAYMENT_STATUS_BADGE_CLASSES: Record<(typeof paymentStatusValues)[number], string> = {
  non_facture: "bg-amber-50 text-amber-700",
  facture: "bg-brand-blue-50 text-brand-blue-700",
  encaisse: "bg-emerald-50 text-emerald-700",
  sans_objet: "bg-gray-100 text-gray-500",
};

const reservationsSearchSchema = z.object({
  bookingId: z.string().optional(),
  status: z.enum(bookingStatusValues).optional(),
  vehicleType: z.enum(vehicleTypeValues).optional(),
  cpamStatus: z.enum(cpamStatusValues).optional(),
  paymentStatus: z.enum(paymentStatusValues).optional(),
  driverId: z.string().optional(),
  seriesId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  atRisk: z.boolean().optional(),
  missingPmt: z.boolean().optional(),
  reminderPending: z.boolean().optional(),
  q: z.string().optional(),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.number().int().min(0).optional().default(0),
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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

const CSV_HEADERS = [
  "Référence", "Patient", "Téléphone", "Date", "Heure", "Adresse de départ", "Adresse d'arrivée",
  "Véhicule", "Type de trajet", "Statut", "Chauffeur", "Prix estimé (€)", "Statut CPAM",
  "Mutuelle", "PMT déclarée", "Rappel envoyé", "Rappel confirmé", "Statut de facturation",
];

function bookingToCsvRow(b: AdminBookingRow): string[] {
  return [
    formatReferenceCode(b.reference_code),
    b.patient_full_name,
    b.patient_phone,
    formatDateFr(b.pickup_datetime),
    formatTimeFr(b.pickup_datetime),
    b.pickup_address,
    b.dropoff_address,
    VEHICLE_LABELS[b.vehicle_type],
    TRIP_TYPE_LABELS[b.trip_type],
    STATUS_LABELS[b.status],
    b.driver?.full_name ?? "",
    b.estimated_price != null ? String(b.estimated_price) : "",
    CPAM_LABELS[b.cpam_status] ?? b.cpam_status,
    b.mutual_name ?? "",
    b.pmt_declared ? "oui" : "non",
    b.reminder_sent_at ? "oui" : "non",
    b.reminder_confirmed_at ? "oui" : "non",
    PAYMENT_STATUS_LABELS[b.payment_status] ?? b.payment_status,
  ];
}

function hasAdvancedFilters(search: z.infer<typeof reservationsSearchSchema>): boolean {
  return Boolean(
    search.dateFrom || search.dateTo || search.driverId || search.cpamStatus || search.paymentStatus ||
    search.atRisk || search.missingPmt || search.reminderPending
  );
}

function KpiTile({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl bg-white p-4 text-left ring-1 transition-colors",
        onClick && "hover:ring-gray-200 cursor-pointer",
        active ? "ring-2 ring-[#1244E8]" : "ring-gray-100"
      )}
    >
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0B0F1C]">{value}</p>
    </Tag>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-2 text-xs font-bold transition-colors",
        active ? "bg-[#1244E8] text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
      )}
    >
      {label}
    </button>
  );
}

function AdminReservationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const [showAdvanced, setShowAdvanced] = useState(() => hasAdvancedFilters(search));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState("");
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (search.q ?? "")) {
        navigate({ search: (prev) => ({ ...prev, q: searchInput || undefined, page: 0 }) });
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Selection is page/filter-scoped — dropped whenever the visible set of
  // rows could change, but not on a realtime-triggered refetch of the same
  // page (which would otherwise wipe an in-progress bulk action).
  useEffect(() => {
    setSelected(new Set());
  }, [
    search.status, search.vehicleType, search.q, search.driverId, search.cpamStatus, search.paymentStatus,
    search.seriesId, search.dateFrom, search.dateTo, search.atRisk, search.missingPmt,
    search.reminderPending, search.sort, search.page,
  ]);

  const filters: adminBookingsRepository.AdminBookingFilters = {
    status: search.status,
    vehicleType: search.vehicleType,
    search: search.q,
    driverId: search.driverId,
    cpamStatus: search.cpamStatus,
    paymentStatus: search.paymentStatus,
    seriesId: search.seriesId,
    missingPmt: search.missingPmt || undefined,
    reminderPending: search.reminderPending || undefined,
  };
  if (search.atRisk) {
    filters.status = "available";
    filters.pickupTo = new Date(Date.now() + AT_RISK_HOURS * 60 * 60 * 1000).toISOString();
  } else {
    if (search.dateFrom) filters.pickupFrom = `${search.dateFrom}T00:00:00.000`;
    if (search.dateTo) filters.pickupTo = `${search.dateTo}T23:59:59.999`;
  }

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-bookings",
      search.status, search.vehicleType, search.q, search.driverId, search.cpamStatus, search.paymentStatus,
      search.seriesId, search.dateFrom, search.dateTo, search.atRisk, search.missingPmt,
      search.reminderPending, search.sort, search.page,
    ],
    queryFn: () => adminBookingsRepository.fetchBookingsAdmin(supabase, filters, search.page, PAGE_SIZE, search.sort),
  });

  const { data: kpis } = useQuery({
    queryKey: ["admin-bookings", "kpis"],
    queryFn: () => adminBookingsRepository.fetchBookingsKpis(supabase, AT_RISK_HOURS),
  });

  const { data: driverOptions } = useQuery({
    queryKey: ["admin-drivers-filter-options"],
    queryFn: () => adminBookingsRepository.fetchDriversForFilter(supabase),
    staleTime: 5 * 60_000,
  });

  const { mutate: exportCsv, isPending: isExporting } = useMutation({
    mutationFn: () => adminBookingsRepository.fetchBookingsForExport(supabase, filters),
    onSuccess: (rows) => {
      if (rows.length === 0) {
        toast({ title: "Aucune réservation à exporter pour ces filtres", variant: "error" });
        return;
      }
      downloadCsv(`reservations_${todayIso()}.csv`, CSV_HEADERS, rows.map(bookingToCsvRow));
    },
    onError: () => toast({ title: "Échec de l'export", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const selectedRows = data ? data.rows.filter((b) => selected.has(b.id)) : [];
  const selectedCancellableIds = selectedRows.filter((b) => isCancellable(b.status)).map((b) => b.id);
  const selectedAssignableRows = selectedRows.filter((b) => b.status === "available");

  const { mutate: bulkCancel, isPending: isBulkCancelling } = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      await Promise.all(ids.map((id) => adminBookingsRepository.adminCancelBooking(supabase, id, reason)));
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: `${ids.length} réservation${ids.length > 1 ? "s" : ""} annulée${ids.length > 1 ? "s" : ""}`, variant: "success" });
      ids.forEach((id) => {
        notifyBookingCancelledServerFn({ data: { bookingId: id } }).catch((err) => {
          logger.warn("email.notifyBookingCancelled failed", { error: err.message, bookingId: id });
        });
      });
      setSelected(new Set());
      setBulkCancelOpen(false);
      setBulkCancelReason("");
    },
    onError: () => toast({ title: "Échec de l'annulation groupée", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const { data: bulkEligibleDrivers, isLoading: isLoadingBulkDrivers } = useQuery({
    queryKey: ["admin-bulk-eligible-drivers", selectedAssignableRows.map((b) => b.id).sort().join(",")],
    queryFn: async () => {
      const perBooking = await Promise.all(
        selectedAssignableRows.map((b) => adminBookingsRepository.fetchEligibleDriversForBooking(supabase, b))
      );
      const [first, ...rest] = perBooking;
      if (!first) return [];
      return first.filter((d) => rest.every((list) => list.some((d2) => d2.profile_id === d.profile_id)));
    },
    enabled: bulkReassignOpen && selectedAssignableRows.length > 0,
  });

  const { mutate: bulkAssign, isPending: isBulkAssigning } = useMutation({
    mutationFn: async ({ ids, driverId }: { ids: string[]; driverId: string }) => {
      await Promise.all(ids.map((id) => adminBookingsRepository.adminAssignDriver(supabase, id, driverId)));
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast({ title: `Chauffeur assigné à ${ids.length} réservation${ids.length > 1 ? "s" : ""}`, variant: "success" });
      ids.forEach((id) => {
        notifyBookingAcceptedServerFn({ data: { bookingId: id } }).catch((err) => {
          logger.warn("email.notifyBookingAccepted failed", { error: err.message, bookingId: id });
        });
        notifyDriverRideAcceptedServerFn({ data: { bookingId: id } }).catch((err) => {
          logger.warn("email.notifyDriverRideAccepted failed", { error: err.message, bookingId: id });
        });
      });
      setSelected(new Set());
      setBulkReassignOpen(false);
    },
    onError: () => toast({ title: "Échec de l'assignation groupée", description: "Réessayez dans un instant.", variant: "error" }),
  });

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    if (!data) return;
    setSelected((prev) =>
      data.rows.length > 0 && data.rows.every((b) => prev.has(b.id)) ? new Set() : new Set(data.rows.map((b) => b.id))
    );
  }

  function exportSelected() {
    if (selectedRows.length === 0) return;
    downloadCsv(`reservations_selection_${todayIso()}.csv`, CSV_HEADERS, selectedRows.map(bookingToCsvRow));
  }

  useRealtime({ table: "bookings", queryKey: ["admin-bookings"] });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const advancedActive = hasAdvancedFilters(search);
  const anyFilterActive = advancedActive || Boolean(search.status || search.vehicleType || search.q || search.seriesId);

  function resetFilters() {
    setSearchInput("");
    navigate({ search: {} });
  }

  function toggleAtRisk() {
    navigate({
      search: (prev) => ({
        ...prev,
        atRisk: prev.atRisk ? undefined : true,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        page: 0,
      }),
    });
  }

  function toggleMissingPmt() {
    navigate({ search: (prev) => ({ ...prev, missingPmt: prev.missingPmt ? undefined : true, page: 0 }) });
  }

  function toggleReminderPending() {
    navigate({
      search: (prev) =>
        prev.reminderPending
          ? { ...prev, reminderPending: undefined }
          : { ...prev, reminderPending: true, atRisk: undefined, dateFrom: todayIso(), dateTo: addDaysIso(2), page: 0 },
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <ClipboardList className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Réservations</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiTile
          label="Aujourd'hui"
          value={kpis?.today ?? "—"}
          active={search.dateFrom === todayIso() && search.dateTo === todayIso()}
          onClick={() => navigate({ search: (prev) => ({ ...prev, dateFrom: todayIso(), dateTo: todayIso(), atRisk: undefined, page: 0 }) })}
        />
        <KpiTile
          label="Non assignées"
          value={kpis?.unassigned ?? "—"}
          active={search.status === "available" && !search.atRisk}
          onClick={() => navigate({ search: (prev) => ({ ...prev, status: "available", atRisk: undefined, page: 0 }) })}
        />
        <KpiTile
          label="À risque"
          value={kpis?.atRisk ?? "—"}
          active={Boolean(search.atRisk)}
          onClick={toggleAtRisk}
        />
        <KpiTile label="Annulation (30j)" value={kpis ? `${kpis.cancellationRate30d}%` : "—"} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
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
            navigate({ search: (prev) => ({ ...prev, status: v === "all" ? undefined : (v as BookingStatus), atRisk: undefined, page: 0 }) })
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

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
            advancedActive ? "border-[#1244E8] text-[#1244E8] bg-brand-blue-50/40" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          Filtres avancés
          {showAdvanced ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>

        <div className="flex gap-2 sm:ml-auto">
          {anyFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            disabled={isExporting}
            onClick={() => exportCsv()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B0F1C] px-3 py-2 text-sm font-bold text-white hover:bg-[#1244E8] disabled:opacity-60 transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isExporting ? "Export…" : "Exporter CSV"}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 mb-5 rounded-xl bg-gray-50 p-4">
          <div className="space-y-1">
            <label htmlFor="reservations-date-from" className="block text-xs font-semibold text-gray-700">Du</label>
            <Input
              id="reservations-date-from"
              type="date"
              value={search.dateFrom ?? ""}
              disabled={Boolean(search.atRisk)}
              onChange={(e) => navigate({ search: (prev) => ({ ...prev, dateFrom: e.target.value || undefined, page: 0 }) })}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="reservations-date-to" className="block text-xs font-semibold text-gray-700">Au</label>
            <Input
              id="reservations-date-to"
              type="date"
              value={search.dateTo ?? ""}
              disabled={Boolean(search.atRisk)}
              onChange={(e) => navigate({ search: (prev) => ({ ...prev, dateTo: e.target.value || undefined, page: 0 }) })}
              className="w-40"
            />
          </div>
          <Select
            value={search.driverId ?? "all"}
            onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, driverId: v === "all" ? undefined : v, page: 0 }) })}
          >
            <SelectTrigger className="w-48"><SelectValue placeholder="Chauffeur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les chauffeurs</SelectItem>
              {driverOptions?.map((d) => (
                <SelectItem key={d.profile_id} value={d.profile_id}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.cpamStatus ?? "all"}
            onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, cpamStatus: v === "all" ? undefined : (v as typeof cpamStatusValues[number]), page: 0 }) })}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="Statut CPAM" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts CPAM</SelectItem>
              {cpamStatusValues.map((c) => (
                <SelectItem key={c} value={c}>{CPAM_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.paymentStatus ?? "all"}
            onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, paymentStatus: v === "all" ? undefined : (v as typeof paymentStatusValues[number]), page: 0 }) })}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="Statut de facturation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts de facturation</SelectItem>
              {paymentStatusValues.map((p) => (
                <SelectItem key={p} value={p}>{PAYMENT_STATUS_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <FilterChip label="PMT manquant" active={Boolean(search.missingPmt)} onClick={toggleMissingPmt} />
          <FilterChip label="Rappel J-1 non envoyé" active={Boolean(search.reminderPending)} onClick={toggleReminderPending} />
        </div>
      )}

      {search.seriesId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-blue-50/60 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0B0F1C]">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Trajets de cette série {data ? `(${data.total})` : ""}
            {data?.rows[0] ? ` — ${data.rows[0].patient_full_name}` : ""}
          </span>
          <button
            type="button"
            onClick={() => navigate({ search: {} })}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1244E8] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Toutes les réservations
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-blue-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-brand-blue-900">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportSelected}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Exporter
            </button>
            {selectedAssignableRows.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkReassignOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
              >
                <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                Assigner un chauffeur ({selectedAssignableRows.length})
              </button>
            )}
            {selectedCancellableIds.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkCancelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Annuler ({selectedCancellableIds.length})
              </button>
            )}
          </div>
        </div>
      )}

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
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-semibold text-gray-600">
                      {CPAM_SHORT_LABELS[booking.cpam_status as (typeof cpamStatusValues)[number]] ?? booking.cpam_status}
                    </span>
                    {booking.reminder_confirmed_at ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600">
                        <MailCheck className="h-3 w-3" aria-hidden="true" /> Rappel confirmé
                      </span>
                    ) : booking.reminder_sent_at ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-400">
                        <Mail className="h-3 w-3" aria-hidden="true" /> Rappel envoyé
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block overflow-hidden rounded-xl ring-1 ring-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-4 py-3 w-8">
                    <Checkbox
                      checked={data.rows.length > 0 && data.rows.every((b) => selected.has(b.id))}
                      onCheckedChange={toggleAllOnPage}
                      aria-label="Tout sélectionner sur cette page"
                    />
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Référence</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Patient</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">
                    <button
                      type="button"
                      onClick={() => navigate({ search: (prev) => ({ ...prev, sort: prev.sort === "asc" ? "desc" : "asc" }) })}
                      className="inline-flex items-center gap-1 hover:text-[#1244E8] transition-colors"
                    >
                      Date
                      {search.sort === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Véhicule</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Trajet</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Chauffeur</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">CPAM</th>
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
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(booking.id)}
                        onCheckedChange={() => toggleSelected(booking.id)}
                        aria-label={`Sélectionner ${formatReferenceCode(booking.reference_code)}`}
                      />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-gray-500">
                      {formatReferenceCode(booking.reference_code)}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{booking.patient_full_name}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {formatDateFr(booking.pickup_datetime)}
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        {formatTimeFr(booking.pickup_datetime)}
                        {booking.reminder_confirmed_at ? (
                          <span title={`Rappel confirmé le ${formatDateFr(booking.reminder_confirmed_at)}`}>
                            <MailCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                          </span>
                        ) : booking.reminder_sent_at ? (
                          <span title={`Rappel envoyé le ${formatDateFr(booking.reminder_sent_at)}, non confirmé`}>
                            <Mail className="h-3 w-3 text-gray-400" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{VEHICLE_LABELS[booking.vehicle_type]}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {booking.trip_type === "multiple" && booking.series_id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ search: { seriesId: booking.series_id!, page: 0 } });
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-semibold text-brand-blue-700 hover:bg-brand-blue-100 transition-colors"
                          title="Voir tous les trajets de cette série"
                        >
                          <Layers className="h-3 w-3" aria-hidden="true" />
                          {tripTypeSummary(booking)}
                        </button>
                      ) : (
                        tripTypeSummary(booking)
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{booking.driver?.full_name ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-500">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                          booking.cpam_status === "none" ? "bg-gray-100 text-gray-600" : "bg-brand-blue-50 text-brand-blue-700"
                        )}
                        title={CPAM_LABELS[booking.cpam_status] ?? booking.cpam_status}
                      >
                        {CPAM_SHORT_LABELS[booking.cpam_status as (typeof cpamStatusValues)[number]] ?? booking.cpam_status}
                      </span>
                    </td>
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
          onViewSeries={(seriesId) => navigate({ search: { seriesId, page: 0 } })}
        />
      )}

      <AlertDialog
        open={bulkCancelOpen}
        onOpenChange={(open) => { if (!open) { setBulkCancelOpen(false); setBulkCancelReason(""); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Annuler {selectedCancellableIds.length} réservation{selectedCancellableIds.length > 1 ? "s" : ""} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Chaque patient concerné sera prévenu par email. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={bulkCancelReason}
            onChange={(e) => setBulkCancelReason(e.target.value)}
            placeholder="Motif de l'annulation…"
            rows={3}
            aria-label="Motif de l'annulation groupée"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBulkCancelling || bulkCancelReason.trim().length === 0}
              onClick={() => bulkCancel({ ids: selectedCancellableIds, reason: bulkCancelReason.trim() })}
            >
              {isBulkCancelling ? "Annulation…" : "Confirmer l'annulation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkReassignOpen} onOpenChange={setBulkReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assigner un chauffeur à {selectedAssignableRows.length} réservation{selectedAssignableRows.length > 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              Seuls les chauffeurs compatibles avec toutes les réservations sélectionnées (véhicule et équipement) sont proposés.
            </DialogDescription>
          </DialogHeader>

          {isLoadingBulkDrivers ? (
            <p className="text-gray-400 py-4 text-center">Chargement…</p>
          ) : !bulkEligibleDrivers || bulkEligibleDrivers.length === 0 ? (
            <p className="text-gray-400 py-4 text-center text-sm">
              Aucun chauffeur n'est compatible avec l'ensemble de la sélection.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {bulkEligibleDrivers.map((driver) => (
                <li key={driver.profile_id}>
                  <button
                    type="button"
                    disabled={isBulkAssigning}
                    onClick={() => bulkAssign({ ids: selectedAssignableRows.map((b) => b.id), driverId: driver.profile_id })}
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
                        driver.availability === "online" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
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
              onClick={() => setBulkReassignOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Detail dialog ───────────────────────────────────────────────────────────

type DialogMode = "view" | "reassign" | "cancel" | "external";

function BookingDetailDialog({
  bookingId,
  onClose,
  onViewSeries,
}: {
  bookingId: string;
  onClose: () => void;
  onViewSeries: (seriesId: string) => void;
}) {
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

  const { mutate: setPaymentStatus, isPending: isSettingPaymentStatus } = useMutation({
    mutationFn: (paymentStatus: (typeof paymentStatusValues)[number]) =>
      adminBookingsRepository.adminSetPaymentStatus(supabase, bookingId, paymentStatus),
    onSuccess: () => {
      invalidateList();
      toast({ title: "Statut de facturation mis à jour", variant: "success" });
    },
    onError: () => toast({ title: "Échec de la mise à jour", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const [noteInput, setNoteInput] = useState("");
  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["admin-booking-notes", bookingId],
    queryFn: () => adminBookingsRepository.fetchBookingNotes(supabase, bookingId),
  });

  const { mutate: addNote, isPending: isAddingNote } = useMutation({
    mutationFn: async (note: string) => {
      const user = await authRepository.getCurrentUser(supabase);
      await adminBookingsRepository.addBookingNote(supabase, bookingId, user?.id ?? null, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-booking-notes", bookingId] });
      setNoteInput("");
    },
    onError: () => toast({ title: "Échec de l'ajout de la note", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const { data: activity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["admin-booking-activity", bookingId],
    queryFn: () =>
      adminActivityRepository.fetchActivityLog(supabase, { targetTable: "bookings", targetId: bookingId }, 0, 5),
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
                <div>
                  <DetailField label="Trajet de la série" value={`${booking.series_index} / ${booking.series_total}`} />
                  {booking.series_id && (
                    <button
                      type="button"
                      onClick={() => onViewSeries(booking.series_id!)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#1244E8] hover:underline"
                    >
                      <Layers className="h-3 w-3" aria-hidden="true" />
                      Voir tous les trajets de cette série
                    </button>
                  )}
                </div>
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
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-1">Statut de facturation</div>
                <Select
                  value={booking.payment_status}
                  disabled={isSettingPaymentStatus}
                  onValueChange={(v) => setPaymentStatus(v as (typeof paymentStatusValues)[number])}
                >
                  <SelectTrigger className="h-8 w-full sm:w-48">
                    <SelectValue>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", PAYMENT_STATUS_BADGE_CLASSES[booking.payment_status])}>
                        {PAYMENT_STATUS_LABELS[booking.payment_status]}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusValues.map((p) => (
                      <SelectItem key={p} value={p}>{PAYMENT_STATUS_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DetailField label="Statut CPAM" value={CPAM_LABELS[booking.cpam_status] ?? booking.cpam_status} />
              {booking.mutual_name && <DetailField label="Mutuelle" value={booking.mutual_name} />}
              <DetailField
                label="Rappel J-1"
                value={
                  booking.reminder_confirmed_at
                    ? `Confirmé le ${formatDateFr(booking.reminder_confirmed_at)} à ${formatTimeFr(booking.reminder_confirmed_at)}`
                    : booking.reminder_sent_at
                    ? `Envoyé le ${formatDateFr(booking.reminder_sent_at)}, non confirmé`
                    : "Pas encore envoyé"
                }
              />
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

              <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                  Notes internes
                </p>
                {isLoadingNotes ? (
                  <p className="text-xs text-gray-400">Chargement…</p>
                ) : notes && notes.length > 0 ? (
                  <ul className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-lg bg-white p-2.5 ring-1 ring-gray-100">
                        <p className="text-sm text-[#0B0F1C] whitespace-pre-wrap">{n.note}</p>
                        <p className="mt-1 text-[10.5px] text-gray-400">
                          {n.author?.full_name ?? "Compte supprimé"} · {formatDateFr(n.created_at)} à {formatTimeFr(n.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 mb-3">Aucune note pour l'instant.</p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Ajouter une note interne (visible uniquement par l'équipe admin)…"
                    rows={2}
                    aria-label="Nouvelle note interne"
                    className="bg-white"
                  />
                  <button
                    type="button"
                    disabled={isAddingNote || noteInput.trim().length === 0}
                    onClick={() => addNote(noteInput.trim())}
                    className="inline-flex shrink-0 items-center justify-center gap-1 self-end rounded-xl bg-[#0B0F1C] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1244E8] disabled:opacity-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Ajouter
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-lg bg-gray-50 p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  Historique récent
                </p>
                {isLoadingActivity ? (
                  <p className="text-xs text-gray-400">Chargement…</p>
                ) : !activity || activity.rows.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune action admin enregistrée sur cette réservation.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {activity.rows.map((row) => (
                      <li key={row.id} className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-500">{row.actor?.full_name ?? "Compte supprimé"}</span>
                        {" — "}
                        {formatDateFr(row.created_at)} à {formatTimeFr(row.created_at)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
