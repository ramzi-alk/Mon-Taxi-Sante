import { createServerFileRoute } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getResendClient, EMAIL_FROM } from "~/lib/resend";
import { bookingExpiredEmail } from "~/server/emailTemplates";
import { logger } from "~/lib/logger";

// Vercel Cron hits this once a day (see vercel.json — Hobby plan caps cron
// frequency at once/day, no hourly option). Real-time exclusion from the
// driver pool does NOT depend on this cron: bookings_pool_for_drivers
// (migration 048) already filters out any 'available' booking whose
// pickup_datetime has passed. This job only handles the parts that need an
// actual status change — marking the booking 'expired' for admin/patient
// visibility and sending the one-time notifications — so up to 24h of lag
// here is acceptable.
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export const ServerRoute = createServerFileRoute("/api/cron/expire-bookings").methods({
  GET: async ({ request }) => {
    if (!isAuthorized(request)) {
      logger.error("cron.expire-bookings unauthorized");
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info("cron.expire-bookings started");

    const admin = getSupabaseAdminClient();

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, patient_full_name, patient_email, reference_code, pickup_datetime")
      .eq("status", "available")
      .lt("pickup_datetime", new Date().toISOString());

    if (error) {
      logger.error("cron.expire-bookings query failed", { error: error.message });
      return Response.json({ expired: 0, error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      logger.info("cron.expire-bookings completed", { expired: 0 });
      return Response.json({ expired: 0 });
    }

    let expired = 0;
    for (const booking of bookings) {
      // Re-checks status='available' at write time in case a driver accepted
      // the ride in the gap between the select above and this update.
      const { data: updatedRows, error: updateError } = await admin
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking.id)
        .eq("status", "available")
        .select("id");

      if (updateError) {
        logger.error("cron.expire-bookings update failed", {
          error: updateError.message,
          bookingId: booking.id,
        });
        continue;
      }
      if (!updatedRows || updatedRows.length === 0) continue; // accepted by a driver in the meantime — skip silently
      expired += 1;

      if (!booking.patient_email) continue;

      try {
        const { subject, html } = bookingExpiredEmail({
          patientFullName: booking.patient_full_name,
          referenceCode: booking.reference_code,
          pickupDatetime: booking.pickup_datetime,
        });
        const { error: sendApiError } = await getResendClient().emails.send({
          from: EMAIL_FROM,
          to: booking.patient_email,
          subject,
          html,
        });
        if (sendApiError) {
          throw new Error(sendApiError.message);
        }
      } catch (sendError) {
        logger.error("cron.expire-bookings send failed", {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          bookingId: booking.id,
        });
      }
    }

    logger.info("cron.expire-bookings completed", { found: bookings.length, expired });
    return Response.json({ expired });
  },
});
