import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Car,
  ClipboardList,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as driversRepository from "~/repositories/driversRepository";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { PendingDriver } from "~/repositories/driversRepository";
import { notifyDriverApprovedServerFn, notifyDriverRejectedServerFn } from "~/server/email";
import { checkAdminAccessServerFn } from "~/server/adminAccess";
import { useToast } from "~/components/ui/toast";
import { Textarea } from "~/components/ui/textarea";
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

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Mon Taxi Santé" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

/**
 * Authoritative check: re-verifies the access token and the role+allowlist
 * server side (see src/server/adminAccess.ts) rather than trusting whatever
 * `profiles.role` the client happened to read under RLS.
 */
async function fetchIsAdmin(): Promise<boolean> {
  const session = await authRepository.getCurrentSession(supabase);
  if (!session) return false;
  return checkAdminAccessServerFn({ data: { accessToken: session.access_token } });
}

async function fetchPendingDrivers(): Promise<PendingDriver[]> {
  return driversRepository.fetchPendingDrivers(supabase);
}

async function fetchBookingStats(): Promise<Record<string, number>> {
  return bookingsRepository.fetchBookingStatusCounts(supabase);
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

function AdminPage() {
  const { data: isAdmin, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["admin-access"],
    queryFn: fetchIsAdmin,
  });

  if (isLoadingAccess) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-24 text-center text-gray-400">Chargement…</div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-24 max-w-md text-center">
          <ShieldAlert className="h-14 w-14 text-amber-500 mx-auto" aria-hidden="true" />
          <h1 className="mt-6 text-2xl font-black tracking-tight text-[#0B0F1C]">
            Accès réservé
          </h1>
          <p className="mt-3 text-gray-500 leading-relaxed">
            Cette page est réservée aux administrateurs de Mon Taxi Santé.
          </p>
          <Link
            to="/connexion"
            className="btn-cta mt-8 inline-flex bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </section>
    );
  }

  return <AdminDashboard />;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50 transition-colors"
      >
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
        Réessayer
      </button>
    </div>
  );
}

function AdminDashboard() {
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

  const {
    data: bookingStats,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin-booking-stats"],
    queryFn: fetchBookingStats,
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

  const statCards = [
    { label: "En attente", value: bookingStats?.pending ?? 0, icon: Clock },
    { label: "Disponibles", value: bookingStats?.available ?? 0, icon: ClipboardList },
    { label: "En cours", value: bookingStats?.in_progress ?? 0, icon: Car },
    { label: "Terminées", value: bookingStats?.completed ?? 0, icon: CheckCircle2 },
  ];

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-12 md:py-16">
        <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-3">
          Administration
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0B0F1C]">
          Tableau de bord administrateur
        </h1>

        <div className="mt-10">
          {isStatsError ? (
            <ErrorState
              message="Impossible de charger les statistiques de réservations."
              onRetry={() => refetchStats()}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="mt-2 text-3xl font-black text-[#0B0F1C]">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#0B0F1C]">
              Candidatures chauffeurs en attente
            </h2>
          </div>

          {isDriversError ? (
            <ErrorState
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
        </div>
      </div>

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
    </section>
  );
}
