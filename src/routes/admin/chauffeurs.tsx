import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, XCircle, Users } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as driversRepository from "~/repositories/driversRepository";
import type { PendingDriver } from "~/repositories/driversRepository";
import { notifyDriverApprovedServerFn, notifyDriverRejectedServerFn } from "~/server/email";
import { useToast } from "~/components/ui/toast";
import { Textarea } from "~/components/ui/textarea";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "~/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/chauffeurs")({
  head: () => ({
    meta: [{ title: "Chauffeurs — Administration — Mon Taxi Santé" }],
  }),
  component: AdminChauffeursPage,
});

async function fetchPendingDrivers(): Promise<PendingDriver[]> {
  return driversRepository.fetchPendingDrivers(supabase);
}

/** DB write is the source of truth; the notification is reported separately
 * so a failed email never masquerades as a failed approval (or vice versa). */
async function approveDriver(driverDetailsId: string): Promise<{ emailSent: boolean }> {
  const user = await authRepository.getCurrentUser(supabase);
  await driversRepository.approveDriver(supabase, driverDetailsId, user?.id ?? null);
  const emailSent = await notifyDriverApprovedServerFn({ data: { driverDetailsId } });
  return { emailSent };
}

async function rejectDriver(input: {
  driverDetailsId: string;
  reason: string;
}): Promise<{ emailSent: boolean }> {
  const user = await authRepository.getCurrentUser(supabase);
  await driversRepository.rejectDriver(supabase, input.driverDetailsId, user?.id ?? null, input.reason);
  const emailSent = await notifyDriverRejectedServerFn({
    data: { driverDetailsId: input.driverDetailsId },
  });
  return { emailSent };
}

function AdminChauffeursPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<PendingDriver | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<PendingDriver | null>(null);

  const {
    data: pendingDrivers,
    isLoading: isLoadingDrivers,
    isError: isDriversError,
    refetch: refetchDrivers,
  } = useQuery({
    queryKey: ["admin-pending-drivers"],
    queryFn: fetchPendingDrivers,
  });

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: approveDriver,
    onSuccess: ({ emailSent }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-drivers"] });
      toast({ title: "Chauffeur approuvé", variant: "success" });
      if (!emailSent) {
        toast({
          title: "Email non envoyé",
          description: "Le chauffeur a été approuvé mais n'a pas pu être notifié par email. Prévenez-le directement.",
          variant: "error",
        });
      }
      setApproveTarget(null);
    },
    onError: () => {
      toast({ title: "Échec de l'approbation", description: "Réessayez dans un instant.", variant: "error" });
    },
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: rejectDriver,
    onSuccess: ({ emailSent }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-drivers"] });
      toast({ title: "Candidature refusée", variant: "success" });
      if (!emailSent) {
        toast({
          title: "Email non envoyé",
          description: "Le refus a été enregistré mais le candidat n'a pas pu être notifié par email.",
          variant: "error",
        });
      }
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: () => {
      toast({ title: "Échec du refus", description: "Réessayez dans un instant.", variant: "error" });
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Candidatures chauffeurs en attente</h1>
      </div>

      {isDriversError ? (
        <AdminErrorState
          message="Impossible de charger les candidatures chauffeurs."
          onRetry={() => refetchDrivers()}
        />
      ) : isLoadingDrivers ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !pendingDrivers || pendingDrivers.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucune candidature en attente.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Chauffeur</th>
                <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Contact</th>
                <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Véhicule</th>
                <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">SIRET</th>
                <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="px-5 py-4 font-medium text-[#0B0F1C]">
                    {driver.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    <div>{driver.profiles?.email}</div>
                    {driver.profiles?.phone && <div>{driver.profiles.phone}</div>}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {driver.vehicle_type === "taxi"
                      ? "Taxi"
                      : driver.vehicle_type === "vsl"
                      ? "VSL"
                      : "Ambulance"}
                    {driver.pmr_equipped && " · PMR"}
                    <div className="text-xs text-gray-400">{driver.vehicle_registration}</div>
                    {driver.parking_municipality && (
                      <div className="text-xs text-gray-400">{driver.parking_municipality}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {driver.siret}
                    {driver.company_name && (
                      <div className="text-xs text-gray-400">{driver.company_name}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectTarget(driver)}
                        disabled={isRejecting || isApproving}
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Refuser
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproveTarget(driver)}
                        disabled={isApproving || isRejecting}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Approuver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approuver ce chauffeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {approveTarget?.profiles?.full_name} pourra se connecter et accepter des courses
              immédiatement. Un email de confirmation lui sera envoyé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isApproving}
              onClick={() => approveTarget && approve(approveTarget.id)}
            >
              {isApproving ? "Approbation…" : "Approuver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser cette candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le motif ci-dessous sera envoyé par email à {rejectTarget?.profiles?.full_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex : pièce d'assurance manquante, SIRET non valide…"
            rows={3}
            aria-label="Motif du refus"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRejecting || rejectReason.trim().length === 0}
              onClick={() =>
                rejectTarget && reject({ driverDetailsId: rejectTarget.id, reason: rejectReason.trim() })
              }
            >
              {isRejecting ? "Refus…" : "Refuser la candidature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
