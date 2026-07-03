import { createServerFileRoute } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getResendClient, EMAIL_FROM } from "~/lib/resend";
import { bookingExpiredEmail } from "~/server/emailTemplates";
import { logger } from "~/lib/logger";

// The actual 'available' → 'expired' status flip happens in Postgres itself
// (pg_cron job expire-overdue-bookings, every 10 min — see migration 049),
// not here: it doesn't depend on Vercel's cron frequency, and it's what
// drives notify_admin_booking_expired (migration 048) for the admin bell.
// This job only sends the one-time patient email for bookings that are
// already 'expired' but haven't been notified yet (expired_notified_at),
// mirroring the reminder_sent_at pattern in booking-reminders.ts. Vercel
// Cron hits this once a day (Hobby plan caps cron frequency at once/day),
// so the email itself can lag up to 24h behind the status change — the
// status/pool/admin-notification side is already near-real-time via pg_cron.
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
      .eq("status", "expired")
      .is("expired_notified_at", null);

    if (error) {
      logger.error("cron.expire-bookings query failed", { error: error.message });
      return Response.json({ notified: 0, error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      logger.info("cron.expire-bookings completed", { notified: 0 });
      return Response.json({ notified: 0 });
    }

    let notified = 0;
    for (const booking of bookings) {
      if (booking.patient_email) {
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
          continue;
        }
      }

      const { error: updateError } = await admin
        .from("bookings")
        .update({ expired_notified_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateError) {
        logger.error("cron.expire-bookings mark-notified failed", {
          error: updateError.message,
          bookingId: booking.id,
        });
        continue;
      }
      notified += 1;
    }

    logger.info("cron.expire-bookings completed", { found: bookings.length, notified });
    return Response.json({ notified });
  },
});
