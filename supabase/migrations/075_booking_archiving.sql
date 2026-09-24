-- Admin reservations tab: archive a booking to declutter the default list
-- without touching its real lifecycle status (a completed, cancelled or
-- external_provider booking stays exactly that — archiving is purely an
-- admin-side visibility flag). Who archived it and when is already covered
-- by the log_admin_activity trigger (045), so no separate archived_by
-- column is needed.

ALTER TABLE public.bookings
  ADD COLUMN archived_at timestamptz;

COMMENT ON COLUMN public.bookings.archived_at IS
  'Admin-only visibility flag: when set, the booking is hidden from the default /admin/reservations list (still reachable via the "archivées" filter). Never affects patient/driver-facing visibility or the booking''s real status.';

-- Partial index: only archived rows need indexing here, and most rows will
-- never be archived.
CREATE INDEX bookings_archived_at_idx ON public.bookings (archived_at) WHERE archived_at IS NOT NULL;

-- Already covered by the existing "bookings: admin all" RLS policy (001)
-- and by the log_admin_activity trigger (045) — no new policy needed.
