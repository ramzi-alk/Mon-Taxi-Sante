import { createServerFileRoute } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getResendClient, EMAIL_FROM, ADMIN_NOTIFICATION_EMAIL } from "~/lib/resend";
import { atRiskBookingsAlertEmail } from "~/server/emailTemplates";
import { logger } from "~/lib/logger";

// Vercel Cron hits this periodically (see vercel.json) to alert the ops team
// when bookings are still unassigned close to pickup — same threshold as the
// "à risque" view on /admin/reservations (see AT_RISK_HOURS there). No
// dedup/tracking column: intentionally re-alerts every run while a booking
// stays unresolved, since a single alert getting missed shouldn't mean
// silence until pickup.
const AT_RISK_HOURS = 4;

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export const ServerRoute = createServerFileRoute("/api/cron/at-risk-bookings").methods({
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

    logger.info("cron.at-risk-bookings completed", { atRisk: bookings.length });
    return Response.json({ alerted: bookings.length });
  },
});
