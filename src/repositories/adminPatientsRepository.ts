import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import { phoneSearchDigits } from "~/lib/phone";

export interface AdminPatientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface AdminPatientBooking {
  id: string;
  reference_code: string;
  pickup_datetime: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
}

export async function searchPatients(client: SupabaseClient, term: string): Promise<AdminPatientRow[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const clauses = [
    `full_name.ilike.%${trimmed}%`,
    `phone.ilike.%${trimmed}%`,
    `email.ilike.%${trimmed}%`,
  ];
  // Le téléphone peut être stocké en +33, 0033 ou avec un 0 initial selon
  // la source de saisie — voir phoneSearchDigits.
  const phoneDigits = phoneSearchDigits(trimmed);
  if (phoneDigits && phoneDigits !== trimmed) {
    clauses.push(`phone.ilike.%${phoneDigits}%`);
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .eq("role", "patient")
    .or(clauses.join(","))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    logger.error("adminPatients.searchPatients failed", { error: error.message });
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function fetchPatientBookings(
  client: SupabaseClient,
  patientId: string
): Promise<AdminPatientBooking[]> {
  const { data, error } = await client
    .from("bookings")
    .select("id, reference_code, pickup_datetime, pickup_address, dropoff_address, status")
    .eq("patient_id", patientId)
    .order("pickup_datetime", { ascending: false })
    .limit(50);

  if (error) {
    logger.error("adminPatients.fetchPatientBookings failed", { error: error.message, patientId });
    throw new Error(error.message);
  }
  return data ?? [];
}
