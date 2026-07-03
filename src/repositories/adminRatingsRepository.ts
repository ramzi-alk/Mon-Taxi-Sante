import type { SupabaseClient } from "~/lib/supabase";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";

export interface AdminRatingRow {
  id: string;
  booking_id: string;
  rater_role: Database["public"]["Enums"]["booking_rating_role"];
  rating: number;
  comment: string | null;
  hidden_at: string | null;
  created_at: string;
  booking: {
    reference_code: string;
    patient_full_name: string;
    driver: { full_name: string } | null;
  } | null;
}

/** Only ratings with a comment matter for moderation — a bare star rating has nothing to hide. */
export async function fetchRatingsForModeration(
  client: SupabaseClient,
  maxRating?: number
): Promise<AdminRatingRow[]> {
  let query = client
    .from("booking_ratings")
    .select(
      "id, booking_id, rater_role, rating, comment, hidden_at, created_at, booking:bookings!inner(reference_code, patient_full_name, driver:profiles!bookings_driver_id_fkey(full_name))"
    )
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (maxRating != null) {
    query = query.lte("rating", maxRating);
  }

  const { data, error } = await query;
  if (error) {
    logger.error("adminRatings.fetchRatingsForModeration failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AdminRatingRow[];
}

export async function hideRating(client: SupabaseClient, ratingId: string, hiddenBy: string | null): Promise<void> {
  const { error } = await client
    .from("booking_ratings")
    .update({ hidden_at: new Date().toISOString(), hidden_by: hiddenBy })
    .eq("id", ratingId);

  if (error) {
    logger.error("adminRatings.hideRating failed", { error: error.message, ratingId });
    throw new Error(error.message);
  }
}

export async function unhideRating(client: SupabaseClient, ratingId: string): Promise<void> {
  const { error } = await client
    .from("booking_ratings")
    .update({ hidden_at: null, hidden_by: null })
    .eq("id", ratingId);

  if (error) {
    logger.error("adminRatings.unhideRating failed", { error: error.message, ratingId });
    throw new Error(error.message);
  }
}
