import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { bookingSchema, BOOKING_STEPS, STEP_FIELDS, type BookingSchema } from "./schema";
import { consumeBookingPrefill } from "~/lib/bookingPrefill";
import {
  clearBookingDraft,
  readBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from "~/lib/bookingDraft";
import { computeSeriesDates } from "~/lib/seriesSchedule";
import { ProgressBar } from "./ProgressBar";
import { Step1Identity } from "./steps/Step1Identity";
import { Step2Route } from "./steps/Step2Route";
import { Step3DateTime } from "./steps/Step3DateTime";
import { Step4VehicleAndNeeds } from "./steps/Step4VehicleAndNeeds";
import { Step5TripType } from "./steps/Step5TripType";
import { Step7CPAMStatus } from "./steps/Step7CPAMStatus";
import { Step8PMT } from "./steps/Step8PMT";
import { Step9Notes } from "./steps/Step9Notes";
import { Step10Confirmation } from "./steps/Step10Confirmation";
import { supabase } from "~/lib/supabase";
import { combineLocalDateTimeToIso } from "~/lib/utils";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { trackCallButtonClick } from "~/lib/trackCallClick";
import { logger } from "~/lib/logger";
import { submitBookingServerFn } from "~/server/booking";
import * as authRepository from "~/repositories/authRepository";
import * as storageRepository from "~/repositories/storageRepository";
import { useToast } from "~/components/ui/toast";

const DEFAULT_VALUES: Partial<BookingSchema> = {
  booking_for_other: false,
  patient_full_name: "",
  patient_phone: "",
  patient_email: "",
  patient_birth_date: "",
  booker_full_name: "",
  booker_phone: "",
  booker_email: "",
  pickup_address: "",
  pickup_lat: null,
  pickup_lng: null,
  pickup_municipality: null,
  dropoff_address: "",
  dropoff_lat: null,
  dropoff_lng: null,
  dropoff_municipality: null,
  distance_km: null,
  pickup_date: "",
  pickup_time: "",
  has_return: false,
  return_date: "",
  return_time: "",
  vehicle_type: "taxi",
  trip_type: "aller_simple",
  is_hospitalization: false,
  requires_wheelchair: false,
  requires_stretcher: false,
  requires_oxygen: false,
  passenger_count: 1,
  cpam_status: "standard",
  mutual_name: "",
  pmt_declared: false,
  pmt_file: null,
  medical_notes: "",
  consent: false,
};

async function getOrCreatePatientSession(fullName: string) {
  const session = await authRepository.getCurrentSession(supabase);
  if (session) return session;

  // The booking form never asks patients to create an account. Sign them in
  // anonymously so bookings.patient_id (NOT NULL, RLS-protected) has a valid,
  // RLS-scoped owner without any visible signup step.
  const { data: anon, error } = await authRepository.signInAnonymously(supabase, {
    full_name: fullName,
    role: "patient",
  });

  if (error || !anon.session) {
    logger.error("booking.submit anonymous signin failed", {
      error: error?.message,
    });
    throw new Error(
      error?.message ?? "Impossible de démarrer la réservation. Réessayez."
    );
  }

  return anon.session;
}

async function submitBooking(data: BookingSchema) {
  const session = await getOrCreatePatientSession(data.patient_full_name);
  const userId = session.user.id;

  // Upload PMT file if present
  let pmtFileUrl: string | null = null;
  if (data.pmt_declared && data.pmt_file instanceof File) {
    const ext = data.pmt_file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    pmtFileUrl = await storageRepository.uploadFile(
      supabase,
      "pmt-documents",
      path,
      data.pmt_file
    );
  }

  const basePayload = {
    patient_id: userId,
    patient_full_name: data.patient_full_name,
    patient_phone: data.patient_phone,
    patient_email: data.patient_email || null,
    patient_birth_date: data.patient_birth_date || null,
    booking_for_other: data.booking_for_other,
    booker_full_name: data.booking_for_other ? (data.booker_full_name || null) : null,
    booker_phone: data.booking_for_other ? (data.booker_phone || null) : null,
    booker_email: data.booking_for_other ? (data.booker_email || null) : null,
    pickup_address: data.pickup_address,
    pickup_lat: data.pickup_lat,
    pickup_lng: data.pickup_lng,
    pickup_municipality: data.pickup_municipality || null,
    dropoff_address: data.dropoff_address,
    dropoff_lat: data.dropoff_lat,
    dropoff_lng: data.dropoff_lng,
    distance_km: data.distance_km,
    vehicle_type: data.vehicle_type,
    trip_type: data.trip_type,
    is_hospitalization: data.is_hospitalization,
    requires_wheelchair: data.requires_wheelchair,
    requires_stretcher: data.requires_stretcher,
    requires_oxygen: data.requires_oxygen,
    passenger_count: data.passenger_count,
    cpam_status: data.cpam_status,
    mutual_name: data.mutual_name || null,
    pmt_declared: data.pmt_declared,
    pmt_file_url: pmtFileUrl,
    medical_notes: data.medical_notes || null,
    consent_accepted_at: new Date().toISOString(),
    status: "pending" as const,
  };

  // A real, dispatchable booking per session is only generated when a PMT is
  // declared — without it there's no prescription to justify recurring
  // transport, so the series collapses to a single aller_simple-shaped row.
  const isPmtSeries =
    data.trip_type === "multiple" &&
    data.pmt_declared &&
    !!data.series_days_of_week?.length &&
    !!data.series_duration_weeks;

  const sessionDates = isPmtSeries
    ? computeSeriesDates(data.pickup_date, data.series_days_of_week!, data.series_duration_weeks!)
    : [data.pickup_date];

  const payloads = sessionDates.map((date) => ({
    ...basePayload,
    pickup_datetime: combineLocalDateTimeToIso(date, data.pickup_time),
    return_datetime:
      !isPmtSeries && data.has_return && data.return_date && data.return_time
        ? combineLocalDateTimeToIso(data.return_date, data.return_time)
        : null,
  }));

  return submitBookingServerFn({
    data: {
      accessToken: session.access_token,
      payloads,
    },
  });
}

// Steps whose fields get repopulated by consumeBookingPrefill() (route,
// vehicle/needs, identity, CPAM) — used to decide when to show the
// "reprised from your last booking" banner in the new step order.
const PREFILL_BANNER_STEPS = [1, 3, 5, 6];

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isPrefilled, setIsPrefilled] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BookingDraft | null>(() => readBookingDraft());

  const form = useForm<BookingSchema>({
    resolver: zodResolver(bookingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  // One-shot: a previous booking's identity/trip fields, handed off via
  // sessionStorage from "Mes réservations" or the reference+phone lookup,
  // so patients don't have to retype information they've already given us.
  // Skipped while an in-progress draft is awaiting a resume/restart decision.
  useEffect(() => {
    if (pendingDraft) return;
    const prefill = consumeBookingPrefill();
    if (!prefill) return;
    form.reset({ ...DEFAULT_VALUES, ...prefill });
    setIsPrefilled(true);
  }, [form, pendingDraft]);

  // Autosave the in-progress form to localStorage so an interrupted booking
  // (call, app switch, closed tab) can be resumed instead of lost outright.
  useEffect(() => {
    if (pendingDraft) return;
    const subscription = form.watch((values) => {
      saveBookingDraft(currentStep, values);
    });
    return () => subscription.unsubscribe();
  }, [form, currentStep, pendingDraft]);

  function resumeDraft() {
    if (!pendingDraft) return;
    form.reset({ ...DEFAULT_VALUES, ...pendingDraft.values });
    setCurrentStep(Math.min(Math.max(pendingDraft.step, 1), BOOKING_STEPS.length));
    consumeBookingPrefill();
    setPendingDraft(null);
  }

  function discardDraft() {
    clearBookingDraft();
    setPendingDraft(null);
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: submitBooking,
    onSuccess: (booking) => {
      clearBookingDraft();
      navigate({
        to: "/reservation/confirmation",
        search: { id: booking.id, seriesTotal: booking.seriesTotal },
      });
    },
    onError: (error: Error) => {
      logger.error("booking.submit failed", { error: error.message });
      setSubmitError(
        "Une erreur est survenue lors de l'envoi de votre réservation. Veuillez réessayer ou nous appeler directement."
      );
    },
  });

  async function handleNext() {
    const fieldsForStep = STEP_FIELDS[currentStep];
    const valid = await form.trigger(fieldsForStep);
    if (valid) {
      const nextStep = Math.min(currentStep + 1, BOOKING_STEPS.length);
      setCurrentStep(nextStep);
      saveBookingDraft(nextStep, form.getValues());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    const prevStep = Math.max(currentStep - 1, 1);
    setCurrentStep(prevStep);
    saveBookingDraft(prevStep, form.getValues());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Safety net: if the final cross-field validation in schema.ts ever fails
  // on a field the user already passed, jump back to wherever that field
  // actually lives instead of leaving the button silently inert.
  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) {
      const invalidFields = Object.keys(form.formState.errors) as (keyof BookingSchema)[];
      const invalidSteps = Object.entries(STEP_FIELDS)
        .filter(([, fields]) => fields.some((field) => invalidFields.includes(field)))
        .map(([step]) => Number(step));

      if (invalidSteps.length > 0) {
        setCurrentStep(Math.min(...invalidSteps));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      logger.warn("booking.submit validation failed", {
        invalidFields,
        invalidSteps,
        errors: Object.fromEntries(
          invalidFields.map((field) => [field, form.formState.errors[field]?.message])
        ),
      });
      toast({
        title: "Informations incomplètes",
        description: "Certaines informations sont manquantes ou invalides. Veuillez les corriger.",
        variant: "error",
      });
      return;
    }
    setSubmitError(null);
    const data = form.getValues();
    await mutateAsync(data);
  }

  const isLastStep = currentStep === BOOKING_STEPS.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top progress header */}
      <div className="sticky top-16 z-30 bg-white border-b shadow-sm">
        <div className="container py-4">
          <ProgressBar currentStep={currentStep} />
        </div>
      </div>

      <div className="container py-8 max-w-2xl">
        {!isLastStep && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-brand-green-50 border border-brand-green-100 px-4 py-2.5 text-xs sm:text-sm text-brand-green-800">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>0&nbsp;€ à avancer</strong> — l&apos;Assurance Maladie règle
              directement le chauffeur via le Tiers-Payant.
            </span>
          </div>
        )}

        {pendingDraft && (
          <div className="rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              Reprendre votre réservation en cours&nbsp;?
            </h2>
            <p className="text-muted-foreground">
              Vous aviez commencé une réservation (étape {pendingDraft.step} sur{" "}
              {BOOKING_STEPS.length}). Voulez-vous la reprendre où vous en étiez,
              ou repartir de zéro&nbsp;?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={resumeDraft}
                className="flex-1 rounded-xl bg-brand-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-brand-blue-700 transition-colors shadow-md shadow-brand-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Reprendre où j&apos;en étais
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Recommencer à zéro
              </button>
            </div>
          </div>
        )}

        {!pendingDraft && (
          <>
            {isPrefilled && PREFILL_BANNER_STEPS.includes(currentStep) && (
              <div
                role="status"
                className="mb-6 flex items-start gap-3 rounded-2xl bg-brand-blue-50 border border-brand-blue-100 p-4 text-sm text-brand-blue-900"
              >
                <Sparkles className="h-5 w-5 shrink-0 text-brand-blue-600" aria-hidden="true" />
                <p className="flex-1 leading-relaxed">
                  Nous avons repris les informations de votre dernière réservation.
                  Vérifiez-les, modifiez-les si besoin, ou laissez-les telles quelles.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPrefilled(false)}
                  className="shrink-0 text-brand-blue-600 hover:text-brand-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  aria-label="Masquer ce message"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isLastStep) handleSubmit();
              }}
              noValidate
              aria-label="Formulaire de réservation de taxi médical"
            >
              {/* Step content */}
              <div
                key={currentStep}
                className="animate-fade-in rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100"
              >
                {currentStep === 1 && <Step2Route form={form} />}
                {currentStep === 2 && <Step3DateTime form={form} />}
                {currentStep === 3 && <Step4VehicleAndNeeds form={form} />}
                {currentStep === 4 && <Step5TripType form={form} />}
                {currentStep === 5 && <Step1Identity form={form} />}
                {currentStep === 6 && <Step7CPAMStatus form={form} />}
                {currentStep === 7 && (
                  <>
                    <Step8PMT form={form} />
                    <div className="my-8 h-px bg-gray-100" />
                    <Step9Notes form={form} />
                  </>
                )}
                {currentStep === 8 && (
                  <Step10Confirmation
                    form={form}
                    isSubmitting={isPending}
                    submitError={submitError}
                  />
                )}
              </div>

              {/* Navigation buttons */}
              {!isLastStep && (
                <div className="flex items-center justify-between mt-6 gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Précédent
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-xl bg-brand-blue-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-brand-blue-700 transition-colors shadow-md shadow-brand-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Étape suivante"
                  >
                    Continuer
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </form>
          </>
        )}

        {/* Help callout */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Besoin d&apos;aide pour remplir le formulaire&nbsp;?</span>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            onClick={() => trackCallButtonClick("booking_form_help")}
            className="font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            Appelez le {CONTACT_PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </div>
  );
}
