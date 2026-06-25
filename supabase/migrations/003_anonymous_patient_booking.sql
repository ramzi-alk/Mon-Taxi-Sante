-- =============================================================================
-- Mon Taxi Santé — Anonymous patient booking
-- The booking form never asks patients to create an account, but
-- bookings.patient_id is NOT NULL and RLS requires auth.uid() = patient_id.
-- Fix: allow Supabase anonymous sign-in to back the booking, which means
-- profiles.email (and the full_name fallback) must tolerate anonymous users
-- (no email at all).
-- =============================================================================

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

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
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Patient'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$;
