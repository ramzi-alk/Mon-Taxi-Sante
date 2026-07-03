import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Command as CommandIcon } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as adminBookingsRepository from "~/repositories/adminBookingsRepository";
import type { AdminBookingRow } from "~/repositories/adminBookingsRepository";
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "~/lib/bookingStatus";
import { formatDateFr, formatTimeFr, formatReferenceCode } from "~/lib/utils";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Global Cmd/Ctrl+K search across /admin/* — currently scoped to bookings
 * (reference/patient/phone), the only admin area with a full detail view
 * today. Extend to drivers/patients once their directories exist.
 */
export function AdminCommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["admin-search-bookings", debouncedQuery],
    queryFn: () => adminBookingsRepository.searchBookingsAdmin(supabase, debouncedQuery),
    enabled: open && debouncedQuery.trim().length >= 2,
  });

  function goToBooking(booking: AdminBookingRow) {
    setOpen(false);
    navigate({ to: "/admin/reservations", search: { bookingId: booking.id } });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-400 hover:border-gray-300 transition-colors w-full max-w-xs"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1 text-left">Rechercher une course…</span>
        <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
          <CommandIcon className="h-2.5 w-2.5" aria-hidden="true" />K
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 max-w-lg p-0 gap-0">
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
            <Search className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Référence, nom ou téléphone patient…"
              className="border-0 shadow-none focus-visible:ring-0 px-0 py-0 h-auto text-base"
              aria-label="Rechercher une réservation"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {debouncedQuery.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                Tapez au moins 2 caractères pour rechercher.
              </p>
            ) : isFetching ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Recherche…</p>
            ) : !results || results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Aucun résultat.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {results.map((booking) => (
                  <li key={booking.id}>
                    <button
                      type="button"
                      onClick={() => goToBooking(booking)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
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
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDateFr(booking.pickup_datetime)} à {formatTimeFr(booking.pickup_datetime)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[booking.status]}`}
                      >
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
