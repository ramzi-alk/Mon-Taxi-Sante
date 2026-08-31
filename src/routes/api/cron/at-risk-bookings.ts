import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getResendClient, EMAIL_FROM, ADMIN_NOTIFICATION_EMAIL } from "~/lib/resend";
import { atRiskBookingsAlertEmail, atRiskPatientEmail } from "~/server/emailTemplates";
import { logger } from "~/lib/logger";

// Vercel Cron hits this once a day (see vercel.json — Hobby plan caps cron
// frequency at once/day, no hourly option). A wider lookahead than the
// live in-app "à risque" view (4h, see AT_RISK_HOURS in
// admin/reservations.tsx and admin/index.tsx) is deliberate: a single daily
// check at a fixed time would otherwise only ever catch bookings whose
// pickup happens to fall in that day's narrow 4h slice. 24h means "flag
// anything that could still be unresolved by the time this runs again
// tomorrow." No dedup/tracking column: intentionally re-alerts every run
// while a booking stays unresolved, since a single alert getting missed
// shouldn't mean silence until pickup.
const AT_RISK_HOURS = 24;

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export const Route = createFileRoute("/api/cron/at-risk-bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
    if (!isAuthorized(request)) {
      logger.error("cron.at-risk-bookings unauthorized");
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info("cron.at-risk-bookings started");

    const admin = getSupabaseAdminClient();
    const cutoff = new Date(Date.now() + AT_RISK_HOURS * 60 * 60 * 1000).toISOString();

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("reference_code, patient_full_name, pickup_datetime")
      .eq("status", "available")
      .lte("pickup_datetime", cutoff)
      .order("pickup_datetime", { ascending: true });

    if (error) {
      logger.error("cron.at-risk-bookings query failed", { error: error.message });
      return Response.json({ alerted: 0, error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      logger.info("cron.at-risk-bookings completed", { atRisk: 0 });
      return Response.json({ alerted: 0 });
    }

    try {
      const { subject, html } = atRiskBookingsAlertEmail({
        bookings: bookings.map((b) => ({
          referenceCode: b.reference_code,
          patientFullName: b.patient_full_name,
          pickupDatetime: b.pickup_datetime,
        })),
        hoursThreshold: AT_RISK_HOURS,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("cron.at-risk-bookings send failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
      });
      return Response.json({ alerted: 0, error: "send_failed" }, { status: 500 });
    }

    // Volet patient : jusqu'ici seul un admin voyait ces courses à risque.
    // Indépendant du volet admin ci-dessus (requête et try/catch séparés) —
    // un échec ici ne doit jamais transformer le succès de l'alerte admin en
    // 500, et inversement. Un seul envoi par réservation (voir
    // patient_risk_alert_sent_at, migration 068), pour rester rassurant
    // plutôt qu'alarmant si le cron tourne plusieurs jours de suite sur une
    // course toujours non résolue.
    let patientsNotified = 0;
    try {
      const { data: patientBatch, error: patientQueryError } = await admin
        .from("bookings")
        .select("id, reference_code, patient_full_name, patient_email, booking_for_other, booker_email, pickup_datetime")
        .eq("status", "available")
        .lte("pickup_datetime", cutoff)
        .is("patient_risk_alert_sent_at", null);

      if (patientQueryError) {
        throw new Error(patientQueryError.message);
      }

      for (const booking of patientBatch ?? []) {
        const recipient =
          booking.booking_for_other && booking.booker_email
            ? booking.booker_email
            : booking.patient_email;
        if (!recipient) continue;

        try {
          const { subject, html } = atRiskPatientEmail({
            patientFullName: booking.patient_full_name,
            referenceCode: booking.reference_code,
            pickupDatetime: booking.pickup_datetime,
          });
          const { error: sendApiError } = await getResendClient().emails.send({
            from: EMAIL_FROM,
            to: recipient,
            subject,
            html,
          });
          if (sendApiError) {
            throw new Error(sendApiError.message);
          }
          await admin
            .from("bookings")
            .update({ patient_risk_alert_sent_at: new Date().toISOString() })
            .eq("id", booking.id);
          patientsNotified++;
        } catch (sendError) {
          logger.error("cron.at-risk-bookings patient send failed", {
            error: sendError instanceof Error ? sendError.message : String(sendError),
            bookingId: booking.id,
          });
        }
      }
    } catch (patientBatchError) {
      logger.error("cron.at-risk-bookings patient batch failed", {
        error: patientBatchError instanceof Error ? patientBatchError.message : String(patientBatchError),
      });
    }

    logger.info("cron.at-risk-bookings completed", { atRisk: bookings.length, patientsNotified });
        return Response.json({ alerted: bookings.length, patientsNotified });
      },
    },
  },
});
