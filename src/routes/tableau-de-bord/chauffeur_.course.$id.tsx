import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import { RideCard, type PoolRide } from "~/components/driver/RideCard";
import { useToast } from "~/components/ui/toast";
import { generateReceiptPdf } from "~/lib/receiptPdf";

export const Route = createFileRoute("/tableau-de-bord/chauffeur_/course/$id")({
  head: () => ({
    meta: [
      { title: "Détail de la course — Docteur Taxi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DriverRideDetailPage,
});

// Deep-linked from the calendar event description (see buildCalendarLinks in
// RideCard.tsx) so a driver can tap the link on their phone's calendar app
// and land directly on this one ride to validate pickup — without hunting
// for it in the dashboard's full ride list.
function DriverRideDetailPage() {
  const { id } = Route.useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rideQuery = useQuery({
    queryKey: ["driver-ride", id],
    queryFn: () => bookingsRepository.fetchDriverRideById(supabase, id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-ride", id] });
    queryClient.invalidateQueries({ queryKey: ["my-rides"] });
  };

  const startMutation = useMutation({
    mutationFn: () => bookingsRepository.startRide(supabase, id),
    onSuccess: () => toast({ title: "Course démarrée", variant: "success" }),
    onSettled: invalidate,
    onError: (error: Error) => {
      logger.error("driver.startRide (detail page) failed", { error: error.message, rideId: id });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => bookingsRepository.completeRide(supabase, id),
    onSuccess: () => toast({ title: "Course terminée !", variant: "success" }),
    onSettled: invalidate,
    onError: (error: Error) => {
      logger.error("driver.completeRide (detail page) failed", { error: error.message, rideId: id });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => bookingsRepository.cancelRideByDriver(supabase, id, reason),
    onSuccess: () =>
      toast({ title: "Course annulée", description: "La course est retournée dans le pool.", variant: "default" }),
    onSettled: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
    },
    onError: (error: Error) => {
      logger.error("driver.cancelRideByDriver (detail page) failed", { error: error.message, rideId: id });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: (vars: { rating: number; comment?: string }) =>
      bookingsRepository.rateBookingAsDriver(supabase, id, vars.rating, vars.comment),
    onSuccess: () => toast({ title: "Avis envoyé", variant: "success" }),
    onSettled: invalidate,
    onError: (error: Error) => {
      logger.error("driver.rateBookingAsDriver (detail page) failed", { error: error.message, rideId: id });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const setActualPriceMutation = useMutation({
    mutationFn: (amount: number) => bookingsRepository.setActualPrice(supabase, id, amount),
    onSuccess: () => toast({ title: "Tarif enregistré", variant: "success" }),
    onSettled: invalidate,
    onError: (error: Error) => {
      logger.error("driver.setActualPrice (detail page) failed", { error: error.message, rideId: id });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const ride = rideQuery.data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link
        to="/tableau-de-bord/chauffeur"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au tableau de bord
      </Link>

      {rideQuery.isLoading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : !ride ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-gray-100">
          <p className="font-semibold text-gray-700">Course introuvable</p>
          <p className="mt-1 text-sm text-gray-500">
            Elle n'existe plus, ou ne vous est pas (ou plus) affectée.
          </p>
        </div>
      ) : (
        <RideCard
          ride={{ ...ride, patient_first_name: ride.patient_full_name.split(" ")[0] ?? "—" } as PoolRide}
          onAccept={() => {}}
          isAccepting={false}
          onStart={() => startMutation.mutate()}
          isStarting={startMutation.isPending}
          onComplete={() => completeMutation.mutate()}
          isCompleting={completeMutation.isPending}
          onCancel={(_, reason) => cancelMutation.mutate(reason)}
          isCancelling={cancelMutation.isPending}
          onRate={(_, rating, comment) => rateMutation.mutate({ rating, comment })}
          isRating={rateMutation.isPending}
          onSetActualPrice={(_, amount) => setActualPriceMutation.mutate(amount)}
          isSettingActualPrice={setActualPriceMutation.isPending}
          onDownloadReceipt={(r) => generateReceiptPdf(r).catch(() => {
            toast({ title: "Erreur", description: "Impossible de générer le justificatif.", variant: "error" });
          })}
        />
      )}
    </div>
  );
}
