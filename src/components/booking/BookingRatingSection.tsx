import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "~/components/ui/toast";
import { StarRating } from "~/components/ui/star-rating";
import { RatingForm } from "./RatingForm";
import { supabase } from "~/lib/supabase";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { LookupCredentials } from "~/repositories/bookingsRepository";

interface BookingRatingSectionProps {
  bookingId: string;
  patientRatingGiven: number | null;
  /** When set, rating proves ownership via reference_code + phone instead of the live auth.uid() session. */
  lookupCredentials?: LookupCredentials;
  /** Called once a rating has been saved, so the parent can reflect it without refetching. */
  onRated: (rating: number) => void;
}

/**
 * Self-contained "rate your driver" flow, extracted from BookingStatusCard —
 * same rationale as CancelBookingAction: its own mutation, its own state,
 * usable without pulling in cancellation/edit logic a read-only consumer
 * doesn't need.
 */
export function BookingRatingSection({
  bookingId,
  patientRatingGiven,
  lookupCredentials,
  onRated,
}: BookingRatingSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: (vars: { rating: number; comment?: string }) =>
      lookupCredentials
        ? bookingsRepository.rateBookingAsPatientByReference(
            supabase,
            lookupCredentials.referenceCode,
            lookupCredentials.phone,
            vars.rating,
            vars.comment
          )
        : bookingsRepository.rateBookingAsPatient(supabase, bookingId, vars.rating, vars.comment),
    onSuccess: (_, vars) => {
      toast({ title: "Merci pour votre avis !", variant: "success" });
      onRated(vars.rating);
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Impossible d'enregistrer votre avis", description: err.message, variant: "error" });
    },
  });

  if (patientRatingGiven != null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Votre avis sur le chauffeur :</span>
        <StarRating value={patientRatingGiven} readOnly size="sm" />
      </div>
    );
  }

  return (
    <RatingForm
      prompt="Comment s'est passée votre course avec ce chauffeur ?"
      submitLabel="Envoyer mon avis"
      isSubmitting={rateMutation.isPending}
      onSubmit={(rating, comment) => rateMutation.mutate({ rating, comment })}
    />
  );
}
