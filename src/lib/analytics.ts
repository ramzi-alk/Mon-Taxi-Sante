import { posthog } from "~/lib/posthog";

/**
 * Fire-and-forget, comme trackCallButtonClick (trackCallClick.ts) : les
 * events produit ne doivent jamais retarder ni faire échouer le flux
 * utilisateur qu'ils mesurent.
 */
function capture(event: string, properties?: Record<string, unknown>): void {
  try {
    posthog.capture(event, properties);
  } catch {
    // best-effort
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  try {
    posthog.identify(userId, properties);
  } catch {
    // best-effort
  }
}

export function resetIdentity(): void {
  try {
    posthog.reset();
  } catch {
    // best-effort
  }
}

// ─── Entonnoir réservation patient ──────────────────────────────────────────

const BOOKING_STEP_NAMES: Record<number, string> = {
  1: "trajet",
  2: "date_heure",
  3: "vehicule_besoins",
  4: "nature_trajet",
  5: "identite",
  6: "statut_cpam",
  7: "pmt_notes",
  8: "confirmation",
};

export function trackBookingStepViewed(step: number): void {
  capture("booking_step_viewed", { step, step_name: BOOKING_STEP_NAMES[step] ?? String(step) });
}

export function trackBookingStepCompleted(step: number): void {
  capture("booking_step_completed", { step, step_name: BOOKING_STEP_NAMES[step] ?? String(step) });
}

export function trackBookingDraftResumed(step: number): void {
  capture("booking_draft_resumed", { step });
}

export function trackBookingDraftDiscarded(step: number): void {
  capture("booking_draft_discarded", { step });
}

export function trackBookingSubmitted(props: {
  tripType: string;
  vehicleType: string;
  cpamStatus: string;
  isSeries: boolean;
  seriesTotal?: number;
  requiresWheelchair: boolean;
  requiresStretcher: boolean;
  requiresOxygen: boolean;
  isHospitalization: boolean;
  bookingForOther: boolean;
  pmtDeclared: boolean;
}): void {
  capture("booking_submitted", {
    trip_type: props.tripType,
    vehicle_type: props.vehicleType,
    cpam_status: props.cpamStatus,
    is_series: props.isSeries,
    series_total: props.seriesTotal,
    requires_wheelchair: props.requiresWheelchair,
    requires_stretcher: props.requiresStretcher,
    requires_oxygen: props.requiresOxygen,
    is_hospitalization: props.isHospitalization,
    booking_for_other: props.bookingForOther,
    pmt_declared: props.pmtDeclared,
  });
}

export function trackBookingSubmitFailed(message: string): void {
  capture("booking_submit_failed", { error: message });
}

export function trackBookingCancelled(props: {
  bookingId: string;
  reason: string;
  hoursUntilPickup: number;
}): void {
  capture("booking_cancelled", {
    booking_id: props.bookingId,
    reason: props.reason,
    within_free_cancel_window: props.hoursUntilPickup >= 24,
  });
}

export function trackBookingRatedByPatient(props: {
  bookingId: string;
  rating: number;
  hasComment: boolean;
}): void {
  capture("booking_rated_by_patient", {
    booking_id: props.bookingId,
    rating: props.rating,
    has_comment: props.hasComment,
  });
}

// ─── Chauffeurs ──────────────────────────────────────────────────────────────

export function trackDriverApplicationSubmitted(props: {
  vehicleType: string;
  pmrEquipped: boolean;
}): void {
  capture("driver_application_submitted", {
    vehicle_type: props.vehicleType,
    pmr_equipped: props.pmrEquipped,
  });
}

export function trackDriverApplicationFailed(message: string): void {
  capture("driver_application_failed", { error: message });
}

export function trackDriverCheckoutStarted(plan: string): void {
  capture("driver_checkout_started", { plan });
}

export function trackDriverPortalOpened(): void {
  capture("driver_portal_opened");
}

export function trackRideAccepted(props: { rideId: string; isSeries?: boolean; count?: number }): void {
  capture("ride_accepted", { ride_id: props.rideId, is_series: !!props.isSeries, count: props.count });
}

export function trackRideRefused(rideId: string): void {
  capture("ride_refused", { ride_id: rideId });
}

export function trackRideStarted(rideId: string): void {
  capture("ride_started", { ride_id: rideId });
}

export function trackRideCompleted(rideId: string): void {
  capture("ride_completed", { ride_id: rideId });
}

export function trackRideCancelledByDriver(props: {
  rideId: string;
  isSeries?: boolean;
  count?: number;
}): void {
  capture("ride_cancelled_by_driver", {
    ride_id: props.rideId,
    is_series: !!props.isSeries,
    count: props.count,
  });
}

export function trackRideRatedByDriver(rideId: string): void {
  capture("ride_rated_by_driver", { ride_id: rideId });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function trackLoginSucceeded(role: string): void {
  capture("auth_login_succeeded", { role });
}

export function trackLoginFailed(reason: string): void {
  capture("auth_login_failed", { reason });
}

export function trackPasswordResetRequested(): void {
  capture("password_reset_requested");
}
