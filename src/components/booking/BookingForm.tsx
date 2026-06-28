import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { bookingSchema, BOOKING_STEPS, STEP_FIELDS, type BookingSchema } from "./schema";
import { consumeBookingPrefill } from "~/lib/bookingPrefill";
import { ProgressBar } from "./ProgressBar";
import { Step1Identity } from "./steps/Step1Identity";
import { Step2Route } from "./steps/Step2Route";
import { Step3DateTime } from "./steps/Step3DateTime";
import { Step4Vehicle } from "./steps/Step4Vehicle";
import { Step5TripType } from "./steps/Step5TripType";
import { Step6Specificities } from "./steps/Step6Specificities";
import { Step7CPAMStatus } from "./steps/Step7CPAMStatus";
import { Step8PMT } from "./steps/Step8PMT";
import { Step9Notes } from "./steps/Step9Notes";
import { Step10Confirmation } from "./steps/Step10Confirmation";
import { supabase } from "~/lib/supabase";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { logger } from "~/lib/logger";
import { submitBookingServerFn } from "~/server/booking";
import * as authRepository from "~/repositories/authRepository";
import * as storageRepository from "~/repositories/storageRepository";
import { useToast } from "~/components/ui/toast";

const DEFAULT_VALUES: Partial<BookingSchema> = {
  patient_full_name: "",
  patient_phone: "",
  patient_email: "",
  patient_birth_date: "",
  pickup_address: "",
  pickup_lat: null,
  pickup_lng: null,
  dropoff_address: "",
  dropoff_lat: null,
  dropoff_lng: null,
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

  return submitBookingServerFn({
    data: {
      accessToken: session.access_token,
      payload: {
        patient_id: userId,
        patient_full_name: data.patient_full_name,
        patient_phone: data.patient_phone,
        patient_email: data.patient_email,
        patient_birth_date: data.patient_birth_date || null,
        pickup_address: data.pickup_address,
        pickup_lat: data.pickup_lat,
        pickup_lng: data.pickup_lng,
        dropoff_address: data.dropoff_address,
        dropoff_lat: data.dropoff_lat,
        dropoff_lng: data.dropoff_lng,
        pickup_datetime: `${data.pickup_date}T${data.pickup_time}:00`,
        return_datetime:
          data.has_return && data.return_date && data.return_time
            ? `${data.return_date}T${data.return_time}:00`
            : null,
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
        status: "pending",
      },
    },
  });
}

export function BookingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isPrefilled, setIsPrefilled] = useState(false);

  const form = useForm<BookingSchema>({
    resolver: zodResolver(bookingSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  // One-shot: a previous booking's identity/trip fields, handed off via
  // sessionStorage from "Mes réservations" or the reference+phone lookup,
  // so patients don't have to retype information they've already given us.
  useEffect(() => {
    const prefill = consumeBookingPrefill();
    if (!prefill) return;
    form.reset({ ...DEFAULT_VALUES, ...prefill });
    setIsPrefilled(true);
  }, [form]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: submitBooking,
    onSuccess: (booking) => {
      navigate({
        to: "/reservation/confirmation",
        search: { id: booking.id },
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
      setCurrentStep((s) => Math.min(s + 1, BOOKING_STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Step 5 (trip type) can flip `has_return` to true after step 3 (date/time,
  // where return_date/return_time are actually entered) has already been
  // validated and passed — e.g. switching to "aller_retour" later, or
  // re-using a previous booking's info, where trip_type isn't carried over
  // (see bookingPrefill.ts) and defaults back to "aller_simple". The
  // cross-field refine in schema.ts then fails at the final step on a field
  // no longer visible there, so jump back to wherever the invalid field
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
        {isPrefilled && currentStep <= 2 && (
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
            {currentStep === 1 && <Step1Identity form={form} />}
            {currentStep === 2 && <Step2Route form={form} />}
            {currentStep === 3 && <Step3DateTime form={form} />}
            {currentStep === 4 && <Step4Vehicle form={form} />}
            {currentStep === 5 && <Step5TripType form={form} />}
            {currentStep === 6 && <Step6Specificities form={form} />}
            {currentStep === 7 && <Step7CPAMStatus form={form} />}
            {currentStep === 8 && <Step8PMT form={form} />}
            {currentStep === 9 && <Step9Notes form={form} />}
            {currentStep === 10 && (
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

        {/* Help callout */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Besoin d&apos;aide pour remplir le formulaire&nbsp;?</span>
          <a
            href={`tel:${CONTACT_PHONE_TEL}`}
            className="font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            Appelez le {CONTACT_PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </div>
  );
}
