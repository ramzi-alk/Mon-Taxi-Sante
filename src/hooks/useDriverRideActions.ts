import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import {
  notifyBookingAcceptedServerFn,
  notifyDriverRideAcceptedServerFn,
  notifyRideUnassignedServerFn,
} from "~/server/email";
import { logger } from "~/lib/logger";
import { useToast } from "~/components/ui/toast";

async function acceptRide(rideId: string): Promise<void> {
  await bookingsRepository.acceptRide(supabase, rideId);
}

async function startRide(rideId: string): Promise<void> {
  await bookingsRepository.startRide(supabase, rideId);
}

async function completeRide(rideId: string): Promise<void> {
  await bookingsRepository.completeRide(supabase, rideId);
}

async function cancelRideByDriver(rideId: string, reason: string): Promise<void> {
  await bookingsRepository.cancelRideByDriver(supabase, rideId, reason);
}

async function refuseRide(rideId: string): Promise<void> {
  await bookingsRepository.refuseRide(supabase, rideId);
}

async function rateRide(vars: { rideId: string; rating: number; comment?: string }): Promise<void> {
  await bookingsRepository.rateBookingAsDriver(supabase, vars.rideId, vars.rating, vars.comment);
}

/**
 * Toutes les mutations du cycle de vie d'une course côté chauffeur
 * (accepter/refuser/démarrer/terminer/annuler, en série ou à l'unité, noter
 * le patient) et l'identifiant de la course en cours de traitement pour
 * chacune — sert à cibler le spinner sur la bonne carte plutôt que sur
 * toute la liste.
 */
export function useDriverRideActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [refusingId, setRefusingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingSeriesId, setCancellingSeriesId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [acceptingSeriesId, setAcceptingSeriesId] = useState<string | null>(null);

  const acceptMutation = useMutation({
    mutationFn: acceptRide,
    onMutate: (rideId) => setAcceptingId(rideId),
    onSuccess: (_, rideId) => {
      toast({ title: "Course acceptée — coordonnées du patient envoyées par email", variant: "success" });
      notifyBookingAcceptedServerFn({ data: { bookingId: rideId } }).catch((err) => {
        logger.warn("email.notifyBookingAccepted failed", { error: err.message, rideId });
      });
      notifyDriverRideAcceptedServerFn({ data: { bookingId: rideId } }).catch((err) => {
        logger.warn("email.notifyDriverRideAccepted failed", { error: err.message, rideId });
      });
    },
    onSettled: () => {
      setAcceptingId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.acceptRide failed", { error: error.message, rideId });
      toast({ title: "Course non disponible", description: error.message, variant: "error" });
    },
  });

  const refuseMutation = useMutation({
    mutationFn: refuseRide,
    onMutate: (rideId) => setRefusingId(rideId),
    onSuccess: () => {
      toast({ title: "Course refusée", description: "Elle n'apparaîtra plus dans votre pool.", variant: "default" });
    },
    onSettled: () => {
      setRefusingId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.refuseRide failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const startMutation = useMutation({
    mutationFn: startRide,
    onMutate: (rideId) => setStartingId(rideId),
    onSuccess: () => {
      toast({ title: "Course démarrée", variant: "success" });
    },
    onSettled: () => {
      setStartingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.startRide failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeRide,
    onMutate: (rideId) => setCompletingId(rideId),
    onSuccess: () => {
      toast({ title: "Course terminée !", variant: "success" });
    },
    onSettled: () => {
      setCompletingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.completeRide failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string; reason: string }) => cancelRideByDriver(rideId, reason),
    onMutate: ({ rideId }) => setCancellingId(rideId),
    onSuccess: (_, { rideId }) => {
      toast({ title: "Course annulée", description: "La course est retournée dans le pool.", variant: "default" });
      notifyRideUnassignedServerFn({ data: { bookingId: rideId } }).catch((err) => {
        logger.warn("email.notifyRideUnassigned failed", { error: err.message, rideId });
      });
    },
    onSettled: () => {
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, { rideId }) => {
      logger.error("driver.cancelRideByDriver failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const cancelSeriesMutation = useMutation({
    mutationFn: async ({ rideIds, reason }: { rideIds: string[]; reason: string }) => {
      for (const id of rideIds) await cancelRideByDriver(id, reason);
    },
    onMutate: ({ rideIds: [firstId] }) => setCancellingSeriesId(firstId),
    onSuccess: (_, { rideIds }) => {
      const n = rideIds.length;
      toast({
        title: `${n} séance${n > 1 ? "s" : ""} annulée${n > 1 ? "s" : ""}`,
        description: "Retournées dans le pool.",
        variant: "default",
      });
      // Un seul email récap : on passe le compte exact annulé pour que l'email
      // reflète les séances réellement perdues (sélection partielle possible)
      notifyRideUnassignedServerFn({ data: { bookingId: rideIds[0], seriesAffectedCount: rideIds.length } }).catch((err) => {
        logger.warn("email.notifyRideUnassigned (series) failed", { error: err.message, rideId: rideIds[0] });
      });
    },
    onSettled: () => {
      setCancellingSeriesId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error) => {
      logger.error("driver.cancelSeriesRides failed", { error: error.message });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const acceptSeriesMutation = useMutation({
    mutationFn: async (rideIds: string[]) => {
      for (const id of rideIds) await acceptRide(id);
    },
    onMutate: ([firstId]) => setAcceptingSeriesId(firstId),
    onSuccess: (_, rideIds) => {
      const n = rideIds.length;
      toast({
        title: `${n} séance${n > 1 ? "s" : ""} acceptée${n > 1 ? "s" : ""} — coordonnées du patient envoyées par email`,
        variant: "success",
      });
      notifyBookingAcceptedServerFn({ data: { bookingId: rideIds[0] } }).catch((err) => {
        logger.warn("email.notifySeriesAccepted failed", { error: err.message, rideId: rideIds[0] });
      });
      notifyDriverRideAcceptedServerFn({ data: { bookingId: rideIds[0], seriesAcceptedCount: n } }).catch((err) => {
        logger.warn("email.notifyDriverSeriesAccepted failed", { error: err.message, rideId: rideIds[0] });
      });
    },
    onSettled: () => {
      setAcceptingSeriesId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error) => {
      logger.error("driver.acceptSeriesRides failed", { error: error.message });
      toast({ title: "Erreur série", description: error.message, variant: "error" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: rateRide,
    onMutate: (vars) => setRatingId(vars.rideId),
    onSuccess: () => {
      toast({ title: "Avis envoyé", variant: "success" });
    },
    onSettled: () => {
      setRatingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
      queryClient.invalidateQueries({ queryKey: ["my-driver-stats"] });
    },
    onError: (error, vars) => {
      logger.error("driver.rateBookingAsDriver failed", { error: error.message, rideId: vars.rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  return {
    acceptMutation,
    acceptingId,
    refuseMutation,
    refusingId,
    startMutation,
    startingId,
    completeMutation,
    completingId,
    cancelMutation,
    cancellingId,
    cancelSeriesMutation,
    cancellingSeriesId,
    acceptSeriesMutation,
    acceptingSeriesId,
    rateMutation,
    ratingId,
  };
}
