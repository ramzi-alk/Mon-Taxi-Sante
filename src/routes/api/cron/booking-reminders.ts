import { createServerFileRoute } from "@tanstack/react-start/server";
import { randomBytes, createHash } from "node:crypto";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getResendClient, EMAIL_FROM } from "~/lib/resend";
import { bookingReminderEmail } from "~/server/emailTemplates";
import { logger } from "~/lib/logger";

// Vercel Cron hits this once daily (see vercel.json) to send the day-before
// reminder + double-confirmation link. Auth is a shared secret rather than a
// user session since this is an unattended machine-to-machine call.
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export const ServerRoute = createServerFileRoute("/api/cron/booking-reminders").methods({
  GET: async ({ request }) => {
    if (!isAuthorized(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const admin = getSupabaseAdminClient();

    // "Tomorrow" in Europe/Paris, expressed as the UTC range covering
    // that whole calendar day, so the comparison works as a plain
    // timestamptz range without needing AT TIME ZONE in JS.
    const parisNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
    );
    const tomorrow = new Date(parisNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, patient_full_name, patient_email, reference_code, pickup_address, dropoff_address, pickup_datetime")
      .in("status", ["available", "accepted"])
      .is("reminder_sent_at", null)
      .gte("pickup_datetime", tomorrow.toISOString())
      .lt("pickup_datetime", dayAfterTomorrow.toISOString());

    if (error) {
      logger.error("cron.booking-reminders query failed", { error: error.message });
      return Response.json({ sent: 0, error: error.message }, { status: 500 });
    }

    let sent = 0;
    for (const booking of bookings ?? []) {
      if (!booking.patient_email) continue;

      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      const { error: tokenError } = await admin.from("booking_reminder_tokens").insert({
        booking_id: booking.id,
        token_hash: tokenHash,
        expires_at: booking.pickup_datetime,
      });
      if (tokenError) {
        logger.error("cron.booking-reminders token insert failed", {
          error: tokenError.message,
          bookingId: booking.id,
        });
        continue;
      }

      try {
        const { subject, html } = bookingReminderEmail({
          patientFullName: booking.patient_full_name,
          referenceCode: booking.reference_code,
          pickupAddress: booking.pickup_address,
          dropoffAddress: booking.dropoff_address,
          pickupDatetime: booking.pickup_datetime,
          token,
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
        logger.error("cron.booking-reminders send failed", {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          bookingId: booking.id,
        });
        continue;
      }

      await admin.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", booking.id);
      sent += 1;
    }

    return Response.json({ sent });
  },
});
