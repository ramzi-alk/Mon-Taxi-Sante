import { createServerFn } from "@tanstack/react-start";
import { getResendClient, EMAIL_FROM } from "~/lib/resend";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { logger } from "~/lib/logger";
import {
  bookingConfirmationEmail,
  bookingCancellationEmail,
  driverApprovedEmail,
} from "./emailTemplates";

// All sends here are best-effort: a Resend failure must never break the
// booking/cancellation/approval flow it's attached to, so every function
// catches and logs rather than throwing.

export async function sendBookingConfirmationEmail(params: {
  to: string;
  patientFullName: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
}): Promise<void> {
  try {
    const { subject, html } = bookingConfirmationEmail(params);
    const { error } = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject,
      html,
    });
    if (error) {
      logger.error("email.sendBookingConfirmationEmail failed", {
        error: error.message,
        referenceCode: params.referenceCode,
      });
    }
  } catch (error) {
    logger.error("email.sendBookingConfirmationEmail failed", {
      error: error instanceof Error ? error.message : String(error),
      referenceCode: params.referenceCode,
    });
  }
}

export const notifyBookingCancelledServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("patient_full_name, patient_email, reference_code, pickup_datetime, cancellation_reason, status")
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "cancelled" || !booking.patient_email) {
      return;
    }

    try {
      const { subject, html } = bookingCancellationEmail({
        patientFullName: booking.patient_full_name,
        referenceCode: booking.reference_code,
        pickupDatetime: booking.pickup_datetime,
        cancellationReason: booking.cancellation_reason,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: booking.patient_email,
        subject,
        html,
      });
      if (sendApiError) {
        logger.error("email.notifyBookingCancelled failed", {
          error: sendApiError.message,
          bookingId: data.bookingId,
        });
      }
    } catch (sendError) {
      logger.error("email.notifyBookingCancelled failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyDriverApprovedServerFn = createServerFn({ method: "POST" })
  .validator((input: { driverDetailsId: string }) => input)
  .handler(async ({ data: input }) => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("drivers_details")
      .select("approved_at, profiles:profile_id(full_name, email)")
      .eq("id", input.driverDetailsId)
      .single();

    const driver = data as unknown as {
      approved_at: string | null;
      profiles: { full_name: string; email: string | null } | null;
    } | null;
    const profile = driver?.profiles;

    if (error || !driver || !driver.approved_at || !profile?.email) {
      return;
    }

    try {
      const { subject, html } = driverApprovedEmail({ driverFullName: profile.full_name });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: profile.email,
        subject,
        html,
      });
      if (sendApiError) {
        logger.error("email.notifyDriverApproved failed", {
          error: sendApiError.message,
          driverDetailsId: input.driverDetailsId,
        });
      }
    } catch (sendError) {
      logger.error("email.notifyDriverApproved failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        driverDetailsId: input.driverDetailsId,
      });
    }
  });
