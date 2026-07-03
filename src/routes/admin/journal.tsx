import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { History, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as adminActivityRepository from "~/repositories/adminActivityRepository";
import type { AdminActivityRow } from "~/repositories/adminActivityRepository";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { formatDateFr, formatTimeFr } from "~/lib/utils";

const PAGE_SIZE = 30;

const journalSearchSchema = z.object({
  targetTable: z.enum(["bookings", "drivers_details", "booking_ratings"]).optional(),
  page: z.number().int().min(0).optional().default(0),
});

export const Route = createFileRoute("/admin/journal")({
  validateSearch: journalSearchSchema,
  head: () => ({
    meta: [{ title: "Journal — Administration — Mon Taxi Santé" }],
  }),
  component: AdminJournalPage,
});

const TABLE_LABELS: Record<string, string> = {
  bookings: "Réservation",
  drivers_details: "Chauffeur",
  booking_ratings: "Avis",
};

// Champs jsonb pertinents pour un journal lisible — le reste (siret,
// vehicle_registration...) ne change jamais via une action admin et
// n'apporte rien à un diff.
const TRACKED_FIELDS: Record<string, { key: string; label: string }[]> = {
  bookings: [
    { key: "status", label: "Statut" },
    { key: "driver_id", label: "Chauffeur assigné" },
    { key: "cancellation_reason", label: "Motif d'annulation" },
  ],
  drivers_details: [
    { key: "approved_at", label: "Approuvé le" },
    { key: "rejected_at", label: "Refusé le" },
    { key: "rejection_reason", label: "Motif du refus" },
    { key: "pool_suspended_until", label: "Suspendu jusqu'au" },
  ],
  booking_ratings: [
    { key: "hidden_at", label: "Masqué le" },
  ],
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "oui" : "non";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return `${formatDateFr(value)} ${formatTimeFr(value)}`;
  }
  return String(value);
}

function ActivityDiff({ row }: { row: AdminActivityRow }) {
  const fields = TRACKED_FIELDS[row.target_table] ?? [];
  const changes = fields
    .map((f) => ({ ...f, before: row.before?.[f.key], after: row.after?.[f.key] }))
    .filter((f) => JSON.stringify(f.before) !== JSON.stringify(f.after));

  if (changes.length === 0) {
    return <p className="text-xs text-gray-400">Aucun champ suivi modifié.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {changes.map((c) => (
        <li key={c.key} className="text-xs text-gray-600">
          <span className="font-semibold text-gray-500">{c.label}</span> : {formatValue(c.before)}{" "}
          <ArrowRight className="inline h-3 w-3 text-gray-300" aria-hidden="true" /> {formatValue(c.after)}
        </li>
      ))}
    </ul>
  );
}

function AdminJournalPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-activity-log", search.targetTable, search.page],
    queryFn: () =>
      adminActivityRepository.fetchActivityLog(supabase, { targetTable: search.targetTable }, search.page, PAGE_SIZE),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <History className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Journal d'activité admin</h1>
      </div>

      <Select
        value={search.targetTable ?? "all"}
        onValueChange={(v) =>
          navigate({ search: { targetTable: v === "all" ? undefined : (v as "bookings" | "drivers_details" | "booking_ratings"), page: 0 } })
        }
      >
        <SelectTrigger className="w-56 mb-5"><SelectValue placeholder="Toutes les catégories" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          <SelectItem value="bookings">Réservations</SelectItem>
          <SelectItem value="drivers_details">Chauffeurs</SelectItem>
          <SelectItem value="booking_ratings">Avis</SelectItem>
        </SelectContent>
      </Select>

      {isError ? (
        <AdminErrorState message="Impossible de charger le journal d'activité." onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !data || data.rows.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucune action admin enregistrée pour ces critères.
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {data.rows.map((row) => (
              <li key={row.id} className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-brand-blue-50 px-2.5 py-1 text-[11px] font-semibold text-brand-blue-900">
                      {TABLE_LABELS[row.target_table] ?? row.target_table}
                    </span>
                    <span className="text-sm font-semibold text-[#0B0F1C]">
                      {row.actor?.full_name ?? "Compte supprimé"}
                    </span>
                    {row.actor?.email && <span className="text-xs text-gray-400">{row.actor.email}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {row.target_table === "bookings" && (
                      <Link
                        to="/admin/reservations"
                        search={{ bookingId: row.target_id }}
                        className="font-mono text-xs font-bold text-brand-blue-700 hover:underline"
                      >
                        Voir la réservation
                      </Link>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDateFr(row.created_at)} à {formatTimeFr(row.created_at)}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <ActivityDiff row={row} />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-400">
              {data.total} action{data.total > 1 ? "s" : ""} — page {search.page + 1}/{totalPages}
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
    </div>
  );
}
