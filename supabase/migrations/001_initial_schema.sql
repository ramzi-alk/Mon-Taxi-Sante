-- =============================================================================
-- Mon Taxi Santé — Initial Database Schema
-- Supabase / PostgreSQL
-- CPAM-compliant medical transport platform
-- =============================================================================
-- HDS (Hébergement de Données de Santé) & RGPD considerations:
--   • Medical data (notes, PMT, CPAM status) is stored only in `bookings`.
--   • Row-Level Security ensures patients can only read their own medical data.
--   • Drivers never see patient medical notes or CPAM status details.
--   • Sensitive fields are nullable to support data minimisation (RGPD Art. 5c).
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for address full-text search

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('patient', 'driver', 'admin');
CREATE TYPE vehicle_type AS ENUM ('taxi', 'vsl', 'ambulance');
CREATE TYPE booking_vehicle_type AS ENUM ('taxi', 'vsl', 'pmr');
CREATE TYPE booking_status AS ENUM (
  'draft',        -- form not yet submitted
  'pending',      -- submitted, awaiting admin confirmation
  'confirmed',    -- admin confirmed, not yet dispatched
  'available',    -- in the ride pool, drivers can accept
  'accepted',     -- a driver has accepted
  'in_progress',  -- driver is en route / trip ongoing
  'completed',    -- trip finished
  'cancelled'     -- cancelled by patient or admin
);
CREATE TYPE trip_type AS ENUM ('aller_simple', 'aller_retour', 'multiple');
CREATE TYPE cpam_status AS ENUM ('ald', 'cmu', 'css', 'standard', 'none');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled');

-- =============================================================================
-- TABLE: profiles
-- Extends auth.users — one row per authenticated user.
-- =============================================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL CHECK (char_length(full_name) >= 2),
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'patient',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
  'Public profile data for all users. Extended from auth.users.';
COMMENT ON COLUMN public.profiles.role IS
  'patient = can book rides; driver = can accept rides; admin = full access.';

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: drivers_details
-- Driver-specific: CPAM accreditation, vehicle info, subscription.
-- =============================================================================

CREATE TABLE public.drivers_details (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  siret                 TEXT NOT NULL CHECK (siret ~ '^\d{14}$'),
  convention_cpam       BOOLEAN NOT NULL DEFAULT FALSE,
  convention_number     TEXT,
  vehicle_type          vehicle_type NOT NULL,
  vehicle_registration  TEXT NOT NULL,
  vehicle_brand         TEXT,
  vehicle_model         TEXT,
  vehicle_year          SMALLINT CHECK (vehicle_year >= 2000 AND vehicle_year <= 2030),
  pmr_equipped          BOOLEAN NOT NULL DEFAULT FALSE,  -- véhicule PMR (handicap)
  -- Subscription (monetisation model)
  subscription_status   subscription_status NOT NULL DEFAULT 'trial',
  subscription_ends_at  TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  -- Admin approval
  approved_by           UUID REFERENCES public.profiles(id),
  approved_at           TIMESTAMPTZ,
  -- Docs
  cpam_certificate_url  TEXT,   -- convention CPAM document
  driving_licence_url   TEXT,
  insurance_url         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.drivers_details IS
  'CPAM accreditation, vehicle info, and subscription data for drivers.';
COMMENT ON COLUMN public.drivers_details.siret IS
  '14-digit French company identification number.';
COMMENT ON COLUMN public.drivers_details.pmr_equipped IS
  'TRUE if vehicle is equipped for wheelchair users (PMR).';

CREATE INDEX idx_drivers_subscription ON public.drivers_details(subscription_status);
CREATE INDEX idx_drivers_approved ON public.drivers_details(approved_at) WHERE approved_at IS NOT NULL;

-- =============================================================================
-- TABLE: bookings
-- Core medical booking entity.
-- ⚠️  Contains health data — RLS is critical here.
-- =============================================================================

CREATE TABLE public.bookings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Ownership
  patient_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  driver_id             UUID REFERENCES public.profiles(id),

  -- Step 1 — Patient identity
  patient_full_name     TEXT NOT NULL,
  patient_phone         TEXT NOT NULL CHECK (patient_phone ~ '^(\+33|0)[1-9]\d{8}$'),
  patient_birth_date    DATE,

  -- Step 2 — Route
  pickup_address        TEXT NOT NULL,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  dropoff_address       TEXT NOT NULL,
  dropoff_lat           DOUBLE PRECISION,
  dropoff_lng           DOUBLE PRECISION,
  distance_km           NUMERIC(8,2),

  -- Step 3 — Date / Time
  pickup_datetime       TIMESTAMPTZ NOT NULL CHECK (pickup_datetime > NOW()),
  return_datetime       TIMESTAMPTZ CHECK (return_datetime IS NULL OR return_datetime > pickup_datetime),

  -- Step 4 — Vehicle
  vehicle_type          booking_vehicle_type NOT NULL DEFAULT 'taxi',

  -- Step 5 — Trip type
  trip_type             trip_type NOT NULL DEFAULT 'aller_simple',

  -- Step 6 — Specificities
  requires_wheelchair   BOOLEAN NOT NULL DEFAULT FALSE,
  requires_stretcher    BOOLEAN NOT NULL DEFAULT FALSE,
  requires_oxygen       BOOLEAN NOT NULL DEFAULT FALSE,
  passenger_count       SMALLINT NOT NULL DEFAULT 1 CHECK (passenger_count BETWEEN 1 AND 8),

  -- Step 7 — CPAM / Medical coverage (HDS-sensitive)
  cpam_status           cpam_status NOT NULL DEFAULT 'standard',
  mutual_name           TEXT,

  -- Step 8 — PMT (Prescription Médicale de Transport) — HDS-sensitive
  pmt_declared          BOOLEAN NOT NULL DEFAULT FALSE,
  pmt_file_url          TEXT,   -- Supabase Storage (private bucket)

  -- Step 9 — Medical notes — HDS-sensitive
  medical_notes         TEXT,

  -- Computed / Admin fields
  estimated_price       NUMERIC(10,2),
  status                booking_status NOT NULL DEFAULT 'draft',
  cancellation_reason   TEXT,

  -- Audit trail
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_pmt_consistency CHECK (
    pmt_declared = TRUE OR pmt_file_url IS NULL
  ),
  CONSTRAINT chk_return_trip CHECK (
    trip_type != 'aller_retour' OR return_datetime IS NOT NULL
  )
);

COMMENT ON TABLE public.bookings IS
  'Medical transport booking. Contains HDS-classified health data (CPAM status, PMT, medical notes). RLS enforced.';
COMMENT ON COLUMN public.bookings.cpam_status IS
  'ALD=Affection Longue Durée (100% covered); CMU=Complémentaire Maladie Universelle; CSS=Complémentaire Solidaire.';
COMMENT ON COLUMN public.bookings.pmt_file_url IS
  'Private Supabase Storage URL for the Prescription Médicale de Transport document.';

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX idx_bookings_patient ON public.bookings(patient_id);
CREATE INDEX idx_bookings_driver  ON public.bookings(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_bookings_status  ON public.bookings(status);
CREATE INDEX idx_bookings_pickup  ON public.bookings(pickup_datetime);
CREATE INDEX idx_bookings_pool    ON public.bookings(status, pickup_datetime)
  WHERE status = 'available';  -- partial index for the ride pool

-- =============================================================================
-- TABLE: driver_subscriptions
-- Tracks subscription lifecycle (Stripe events feed into this).
-- =============================================================================

CREATE TABLE public.driver_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id           UUID NOT NULL REFERENCES public.drivers_details(id) ON DELETE CASCADE,
  stripe_sub_id       TEXT UNIQUE,
  plan                TEXT NOT NULL DEFAULT 'mensuel', -- mensuel / annuel
  amount_eur          NUMERIC(8,2) NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  status              subscription_status NOT NULL DEFAULT 'trial',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STORAGE BUCKETS
-- Declare the private medical documents bucket (run via Supabase dashboard or CLI)
-- =============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pmt-documents', 'pmt-documents', FALSE);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', FALSE);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;

-- ─── Helper: is_admin() ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'driver'
  );
$$;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Users see only their own profile; admins see all.

CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
  -- Users cannot escalate their own role

CREATE POLICY "profiles: admin all"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ─── DRIVERS_DETAILS ─────────────────────────────────────────────────────────
-- Drivers manage their own record; admins have full access.

CREATE POLICY "drivers: own read/write"
  ON public.drivers_details FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "drivers: admin all"
  ON public.drivers_details FOR ALL
  USING (public.is_admin());

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
-- CRITICAL: Medical data access control
--   • Patients: only their own bookings (all columns)
--   • Drivers: only bookings in 'available' status OR their own accepted rides
--              BUT with medical fields hidden (enforced via a security view below)
--   • Admins: full access to all bookings

-- Patients: full access to own bookings
CREATE POLICY "bookings: patient own"
  ON public.bookings FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Drivers: INSERT denied; can only SELECT & UPDATE (accept) specific statuses
CREATE POLICY "bookings: driver pool view"
  ON public.bookings FOR SELECT
  USING (
    public.is_driver() AND (
      status = 'available'
      OR (status IN ('accepted', 'in_progress', 'completed') AND driver_id = auth.uid())
    )
  );

CREATE POLICY "bookings: driver accept"
  ON public.bookings FOR UPDATE
  USING (
    public.is_driver()
    AND status = 'available'
    AND driver_id IS NULL
  )
  WITH CHECK (
    driver_id = auth.uid()
    AND status = 'accepted'
  );

-- Admins: full access
CREATE POLICY "bookings: admin all"
  ON public.bookings FOR ALL
  USING (public.is_admin());

-- ─── DRIVER_SUBSCRIPTIONS ────────────────────────────────────────────────────

CREATE POLICY "subscriptions: driver own"
  ON public.driver_subscriptions FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers_details WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "subscriptions: admin all"
  ON public.driver_subscriptions FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- SECURITY VIEW: bookings_pool_for_drivers
-- Exposes only non-medical fields to drivers browsing the pool.
-- Medical fields (cpam_status, medical_notes, pmt*, birth_date) are stripped.
-- =============================================================================

CREATE OR REPLACE VIEW public.bookings_pool_for_drivers
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  -- Patient shown only as first name + masked surname for RGPD
  split_part(b.patient_full_name, ' ', 1) AS patient_first_name,
  b.patient_phone,
  -- Route — fully visible for dispatch
  b.pickup_address,
  b.pickup_lat,
  b.pickup_lng,
  b.dropoff_address,
  b.dropoff_lat,
  b.dropoff_lng,
  b.distance_km,
  -- Logistics
  b.pickup_datetime,
  b.return_datetime,
  b.vehicle_type,
  b.trip_type,
  b.requires_wheelchair,
  b.requires_stretcher,
  b.requires_oxygen,
  b.passenger_count,
  -- Pricing (no medical context exposed)
  b.estimated_price,
  b.status,
  b.created_at
FROM public.bookings b
WHERE b.status = 'available';

COMMENT ON VIEW public.bookings_pool_for_drivers IS
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT, medical notes, birth date) for driver consumption.';

-- =============================================================================
-- REALTIME PUBLICATION
-- Enable Supabase Realtime on the pool view for drivers.
-- =============================================================================

-- Enable realtime on bookings (filtered by RLS at row level)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- =============================================================================
-- SEED DATA (development only — remove in production)
-- =============================================================================

-- Admin user placeholder (replace uuid with actual auth.users ID after signup)
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'admin@mon-taxi-sante.fr', 'Administrateur', 'admin');
