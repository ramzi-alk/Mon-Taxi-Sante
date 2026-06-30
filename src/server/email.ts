import { createServerFn } from "@tanstack/react-start";
import { getResendClient, EMAIL_FROM, ADMIN_NOTIFICATION_EMAIL } from "~/lib/resend";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { logger } from "~/lib/logger";
import { isContactRevealedAt } from "~/lib/bookingMasking";
import { sendPushToDriver } from "./push";
import {
  bookingConfirmationEmail,
  bookingCancellationEmail,
  bookingAcceptedEmail,
  rideAcceptedDriverEmail,
  bookingUpdatedDriverEmail,
  rideUnassignedByDriverEmail,
  bookingCancelledDriverEmail,
  driverApprovedEmail,
  adminNewDriverApplicationEmail,
} from "./emailTemplates";

// All sends here are best-effort: a Resend failure must never break the
// booking/cancellation/approval flow it's attached to, so every function
// catches and logs rather than throwing.

export async function sendBookingConfirmationEmail(params: {
  to: string;
  patientFullName: string;
  bookerFullName?: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  seriesTotal?: number;
  seriesLastPickupDatetime?: string;
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
      throw new Error(error.message);
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
      .select(
        "patient_full_name, patient_email, booking_for_other, booker_email, reference_code, pickup_datetime, cancellation_reason, status, driver_id"
      )
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "cancelled") {
      return;
    }

    const bookingTyped = booking as typeof booking & { booking_for_other: boolean; booker_email: string | null };
    const cancellationRecipient =
      bookingTyped.booking_for_other && bookingTyped.booker_email
        ? bookingTyped.booker_email
        : booking.patient_email;

    if (cancellationRecipient) {
      try {
        const { subject, html } = bookingCancellationEmail({
          patientFullName: booking.patient_full_name,
          referenceCode: booking.reference_code,
          pickupDatetime: booking.pickup_datetime,
          cancellationReason: booking.cancellation_reason,
        });
        const { error: sendApiError } = await getResendClient().emails.send({
          from: EMAIL_FROM,
          to: cancellationRecipient,
          subject,
          html,
        });
        if (sendApiError) {
          throw new Error(sendApiError.message);
        }
      } catch (sendError) {
        logger.error("email.notifyBookingCancelled failed", {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          bookingId: data.bookingId,
        });
      }
    }

    // A driver may already have accepted this ride before the patient
    // cancelled — they otherwise have no way of knowing it disappeared.
    // Independent of the patient email above: one failing must not skip the other.
    if (booking.driver_id) {
      try {
        const { data: driverProfile } = await admin
          .from("profiles")
          .select("full_name, email")
          .eq("id", booking.driver_id)
          .single();

        if (driverProfile?.email) {
          const { subject, html } = bookingCancelledDriverEmail({
            driverFullName: driverProfile.full_name,
            referenceCode: booking.reference_code,
            pickupDatetime: booking.pickup_datetime,
          });
          const { error: sendApiError } = await getResendClient().emails.send({
            from: EMAIL_FROM,
            to: driverProfile.email,
            subject,
            html,
          });
          if (sendApiError) {
            throw new Error(sendApiError.message);
          }
        }
      } catch (sendError) {
        logger.error("email.notifyBookingCancelled (driver) failed", {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          bookingId: data.bookingId,
        });
      }
    }
  });

export const notifyBookingAcceptedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select(
        "patient_full_name, patient_email, booking_for_other, booker_email, reference_code, pickup_address, dropoff_address, pickup_datetime, status, driver_id, series_id"
      )
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "accepted" || !booking.driver_id) {
      return;
    }

    const bookingTyped2 = booking as typeof booking & {
      booking_for_other: boolean;
      booker_email: string | null;
      series_id: string | null;
    };
    const acceptedRecipient =
      bookingTyped2.booking_for_other && bookingTyped2.booker_email
        ? bookingTyped2.booker_email
        : booking.patient_email;

    if (!acceptedRecipient) {
      return;
    }

    // Fetch series info in parallel with driver info when applicable.
    // Filter to rides accepted by THIS driver so the count reflects what was
    // actually accepted (a driver may have accepted a subset of the series).
    const seriesQuery = bookingTyped2.series_id
      ? admin
          .from("bookings")
          .select("pickup_datetime")
          .eq("series_id", bookingTyped2.series_id)
          .eq("status", "accepted")
          .eq("driver_id", booking.driver_id)
          .order("pickup_datetime", { ascending: true })
      : null;

    const [{ data: driverProfile }, { data: driverDetails }, { data: driverAverageRating }, seriesResult] =
      await Promise.all([
        admin.from("profiles").select("full_name, phone").eq("id", booking.driver_id).single(),
        admin
          .from("drivers_details")
          .select("vehicle_brand, vehicle_model, vehicle_registration")
          .eq("profile_id", booking.driver_id)
          .single(),
        admin.rpc("driver_average_rating", { p_driver_id: booking.driver_id }),
        seriesQuery ?? Promise.resolve({ data: null }),
      ]);

    if (!driverProfile) {
      return;
    }

    const seriesRides = seriesResult?.data as Array<{ pickup_datetime: string }> | null;
    const seriesTotal = seriesRides && seriesRides.length > 1 ? seriesRides.length : undefined;
    const seriesLastPickupDatetime = seriesTotal
      ? seriesRides![seriesRides!.length - 1].pickup_datetime
      : undefined;

    try {
      const { subject, html } = bookingAcceptedEmail({
        patientFullName: booking.patient_full_name,
        referenceCode: booking.reference_code,
        pickupAddress: booking.pickup_address,
        dropoffAddress: booking.dropoff_address,
        pickupDatetime: booking.pickup_datetime,
        driverFullName: driverProfile.full_name,
        driverPhone: driverProfile.phone,
        vehicleBrand: driverDetails?.vehicle_brand ?? null,
        vehicleModel: driverDetails?.vehicle_model ?? null,
        vehicleRegistration: driverDetails?.vehicle_registration ?? null,
        driverAverageRating: driverAverageRating ?? null,
        seriesTotal,
        seriesLastPickupDatetime,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: acceptedRecipient,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyBookingAccepted failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyDriverRideAcceptedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string; seriesAcceptedCount?: number }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select(
        "patient_full_name, patient_phone, pickup_address, dropoff_address, pickup_datetime, reference_code, driver_id, series_id"
      )
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || !booking.driver_id) {
      return;
    }

    const { data: driverProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.driver_id)
      .single();

    if (!driverProfile?.email) {
      return;
    }

    const bookingTyped = booking as typeof booking & { series_id: string | null; patient_phone: string | null };
    let seriesTotal: number | undefined;
    let seriesLastPickupDatetime: string | undefined;
    if (bookingTyped.series_id && (data.seriesAcceptedCount ?? 0) > 1) {
      const { data: seriesRides } = await admin
        .from("bookings")
        .select("pickup_datetime")
        .eq("series_id", bookingTyped.series_id)
        .eq("status", "accepted")
        .eq("driver_id", booking.driver_id)
        .order("pickup_datetime", { ascending: true });
      if (seriesRides && seriesRides.length > 1) {
        seriesTotal = data.seriesAcceptedCount ?? seriesRides.length;
        seriesLastPickupDatetime = seriesRides[seriesRides.length - 1].pickup_datetime;
      }
    }

    const contactRevealed = isContactRevealedAt(bookingTyped.pickup_datetime);

    try {
      const { subject, html } = rideAcceptedDriverEmail({
        driverFullName: driverProfile.full_name,
        patientFullName: bookingTyped.patient_full_name,
        patientPhone: contactRevealed ? bookingTyped.patient_phone : null,
        patientPhoneMasked: !contactRevealed,
        referenceCode: bookingTyped.reference_code,
        pickupAddress: bookingTyped.pickup_address,
        dropoffAddress: bookingTyped.dropoff_address,
        pickupDatetime: bookingTyped.pickup_datetime,
        seriesTotal,
        seriesLastPickupDatetime,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: driverProfile.email,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyDriverRideAccepted failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyBookingUpdatedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("reference_code, pickup_address, dropoff_address, pickup_datetime, status, driver_id")
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "accepted" || !booking.driver_id) {
      return;
    }

    // Push notification — fire-and-forget, independent of email
    sendPushToDriver(booking.driver_id, {
      title: "Course modifiée par le patient",
      body: `Vérifiez les nouveaux détails de la course du ${new Date(booking.pickup_datetime).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`,
      url: "/tableau-de-bord/chauffeur",
      tag: `booking-updated-${data.bookingId}`,
    }).catch(() => {});

    try {
      const { data: driverProfile } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", booking.driver_id)
        .single();

      if (!driverProfile?.email) {
        return;
      }

      const { subject, html } = bookingUpdatedDriverEmail({
        driverFullName: driverProfile.full_name,
        referenceCode: booking.reference_code,
        pickupAddress: booking.pickup_address,
        dropoffAddress: booking.dropoff_address,
        pickupDatetime: booking.pickup_datetime,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: driverProfile.email,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyBookingUpdated failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyRideUnassignedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string; seriesAffectedCount?: number }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("patient_full_name, patient_email, booking_for_other, booker_email, reference_code, pickup_datetime, status, series_id")
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "available") {
      return;
    }

    const bookingTyped3 = booking as typeof booking & {
      booking_for_other: boolean;
      booker_email: string | null;
      series_id: string | null;
    };
    const unassignedRecipient =
      bookingTyped3.booking_for_other && bookingTyped3.booker_email
        ? bookingTyped3.booker_email
        : booking.patient_email;

    if (!unassignedRecipient) {
      return;
    }

    // Fetch series context when applicable.
    // When the caller passes seriesAffectedCount (partial series cancel), use that
    // as the total so the email reflects rides actually lost, not the full series.
    let seriesTotal: number | undefined;
    let seriesLastPickupDatetime: string | undefined;
    if (bookingTyped3.series_id) {
      const { data: seriesRides } = await admin
        .from("bookings")
        .select("pickup_datetime")
        .eq("series_id", bookingTyped3.series_id)
        .order("pickup_datetime", { ascending: true });
      if (seriesRides && seriesRides.length > 1) {
        seriesTotal = data.seriesAffectedCount ?? seriesRides.length;
        seriesLastPickupDatetime = seriesRides[seriesRides.length - 1].pickup_datetime;
      }
    }

    try {
      const { subject, html } = rideUnassignedByDriverEmail({
        patientFullName: booking.patient_full_name,
        referenceCode: booking.reference_code,
        pickupDatetime: booking.pickup_datetime,
        seriesTotal,
        seriesLastPickupDatetime,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: unassignedRecipient,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyRideUnassigned failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyDriverPatientCancelledServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("driver_id, reference_code, pickup_datetime")
      .eq("id", data.bookingId)
      .single();

    if (error || !booking?.driver_id) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.driver_id)
      .single();

    if (!profile?.email) return;

    // Push notification — fire-and-forget, independent of email
    sendPushToDriver(booking.driver_id, {
      title: "Course annulée par le patient",
      body: `La course du ${new Date(booking.pickup_datetime).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} a été annulée.`,
      url: "/tableau-de-bord/chauffeur",
      tag: `booking-cancelled-${data.bookingId}`,
    }).catch(() => {});

    try {
      const { subject, html } = bookingCancelledDriverEmail({
        driverFullName: profile.full_name ?? "Chauffeur",
        referenceCode: booking.reference_code,
        pickupDatetime: booking.pickup_datetime,
      });
      const { error: sendError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: profile.email,
        subject,
        html,
      });
      if (sendError) throw new Error(sendError.message);
    } catch (err) {
      logger.error("email.notifyDriverPatientCancelled failed", {
        error: err instanceof Error ? err.message : String(err),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyAdminNewDriverApplicationServerFn = createServerFn({ method: "POST" })
  .validator((input: { driverDetailsId: string }) => input)
  .handler(async ({ data: input }) => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("drivers_details")
      .select("vehicle_type, vehicle_registration, siret, company_name, profiles:profile_id(full_name, email, phone)")
      .eq("id", input.driverDetailsId)
      .single();

    const driver = data as unknown as {
      vehicle_type: string;
      vehicle_registration: string;
      siret: string;
      company_name: string | null;
      profiles: { full_name: string; email: string | null; phone: string | null } | null;
    } | null;

    if (error || !driver || !driver.profiles?.email) {
      return;
    }

    try {
      const { subject, html } = adminNewDriverApplicationEmail({
        driverFullName: driver.profiles.full_name,
        driverEmail: driver.profiles.email,
        driverPhone: driver.profiles.phone,
        vehicleType: driver.vehicle_type,
        vehicleRegistration: driver.vehicle_registration,
        siret: driver.siret,
        companyName: driver.company_name,
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
      logger.error("email.notifyAdminNewDriverApplication failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        driverDetailsId: input.driverDetailsId,
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
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyDriverApproved failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        driverDetailsId: input.driverDetailsId,
      });
    }
  });
