import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import {
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  FileWarning,
  Star,
} from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as driversRepository from "~/repositories/driversRepository";
import * as adminDriversRepository from "~/repositories/adminDriversRepository";
import type { PendingDriver } from "~/repositories/driversRepository";
import type { AdminDriverDirectoryRow } from "~/repositories/adminDriversRepository";
import {
  notifyDriverApprovedServerFn,
  notifyDriverRejectedServerFn,
  notifyDriverDocumentRequestServerFn,
} from "~/server/email";
import { useToast } from "~/components/ui/toast";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { cn, formatDateFr, formatTimeFr } from "~/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";

const chauffeursSearchSchema = z.object({
  tab: z.enum(["candidatures", "repertoire"]).optional().default("candidatures"),
});

export const Route = createFileRoute("/admin/chauffeurs")({
  validateSearch: chauffeursSearchSchema,
  head: () => ({
    meta: [{ title: "Chauffeurs — Administration — Docteur Taxi" }],
  }),
  component: AdminChauffeursPage,
});

// "Signal faible" : chauffeur suspendu, sujet à des annulations suspectes,
// ou mal noté — des cas à surveiller sans attendre une plainte patient.
const LOW_RATING_THRESHOLD = 3;
const SUSPICIOUS_CANCELLATION_THRESHOLD = 2;

function isWeakSignal(driver: AdminDriverDirectoryRow): boolean {
  const suspended = !!driver.pool_suspended_until && new Date(driver.pool_suspended_until) > new Date();
  return (
    suspended ||
    driver.suspicious_cancellation_count >= SUSPICIOUS_CANCELLATION_THRESHOLD ||
    (driver.average_rating != null && driver.average_rating < LOW_RATING_THRESHOLD)
  );
}

function AdminChauffeursPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Chauffeurs</h1>
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as "candidatures" | "repertoire" } })}>
        <TabsList>
          <TabsTrigger value="candidatures">Candidatures</TabsTrigger>
          <TabsTrigger value="repertoire">Répertoire</TabsTrigger>
        </TabsList>

        <TabsContent value="candidatures">
          <CandidaturesTab />
        </TabsContent>
        <TabsContent value="repertoire">
          <RepertoireTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Candidatures ────────────────────────────────────────────────────────────

async function fetchPendingDrivers(): Promise<PendingDriver[]> {
  return driversRepository.fetchPendingDrivers(supabase);
}

async function approveDriver(driverDetailsId: string): Promise<{ emailSent: boolean }> {
  const user = await authRepository.getCurrentUser(supabase);
  await driversRepository.approveDriver(supabase, driverDetailsId, user?.id ?? null);
  const emailSent = await notifyDriverApprovedServerFn({ data: { driverDetailsId } });
  return { emailSent };
}

async function rejectDriver(input: { driverDetailsId: string; reason: string }): Promise<{ emailSent: boolean }> {
  const user = await authRepository.getCurrentUser(supabase);
  await driversRepository.rejectDriver(supabase, input.driverDetailsId, user?.id ?? null, input.reason);
  const emailSent = await notifyDriverRejectedServerFn({ data: { driverDetailsId: input.driverDetailsId } });
  return { emailSent };
}

function CandidaturesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<PendingDriver | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<PendingDriver | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

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
    onError: () => toast({ title: "Échec de l'approbation", description: "Réessayez dans un instant.", variant: "error" }),
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
    onError: () => toast({ title: "Échec du refus", description: "Réessayez dans un instant.", variant: "error" }),
  });

  const { mutate: bulkApprove, isPending: isBulkApproving } = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => approveDriver(id)));
      return results.filter((r) => !r.emailSent).length;
    },
    onSuccess: (emailFailures, ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-drivers"] });
      toast({ title: `${ids.length} chauffeur${ids.length > 1 ? "s" : ""} approuvé${ids.length > 1 ? "s" : ""}`, variant: "success" });
      if (emailFailures > 0) {
        toast({
          title: `${emailFailures} email${emailFailures > 1 ? "s" : ""} non envoyé${emailFailures > 1 ? "s" : ""}`,
          description: "Certains chauffeurs approuvés n'ont pas pu être notifiés par email.",
          variant: "error",
        });
      }
      setSelected(new Set());
      setBulkConfirmOpen(false);
    },
    onError: () => toast({ title: "Échec de l'approbation groupée", description: "Réessayez dans un instant.", variant: "error" }),
  });

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!pendingDrivers) return;
    setSelected((prev) => (prev.size === pendingDrivers.length ? new Set() : new Set(pendingDrivers.map((d) => d.id))));
  }

  return (
    <div>
      {isDriversError ? (
        <AdminErrorState message="Impossible de charger les candidatures chauffeurs." onRetry={() => refetchDrivers()} />
      ) : isLoadingDrivers ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !pendingDrivers || pendingDrivers.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucune candidature en attente.
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex items-center justify-between mb-3 rounded-xl bg-brand-blue-50 px-4 py-2.5">
              <span className="text-sm font-semibold text-brand-blue-900">
                {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0F1C] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1244E8] transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Approuver la sélection
              </button>
            </div>
          )}

          {/* Mobile: stacked cards */}
          <ul className="flex flex-col gap-2 sm:hidden">
            {pendingDrivers.map((driver) => (
              <li key={driver.id} className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      checked={selected.has(driver.id)}
                      onCheckedChange={() => toggleSelected(driver.id)}
                      aria-label={`Sélectionner ${driver.profiles?.full_name ?? "ce chauffeur"}`}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-[#0B0F1C]">{driver.profiles?.full_name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{driver.profiles?.email}</p>
                      {driver.profiles?.phone && <p className="text-xs text-gray-500">{driver.profiles.phone}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {driver.vehicle_type === "taxi" ? "Taxi" : driver.vehicle_type === "vsl" ? "VSL" : "Ambulance"}
                        {driver.pmr_equipped && " · PMR"} — {driver.vehicle_registration}
                      </p>
                      <p className="text-xs text-gray-400">SIRET {driver.siret}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setRejectTarget(driver)}
                    disabled={isRejecting || isApproving}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproveTarget(driver)}
                    disabled={isApproving || isRejecting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Approuver
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block overflow-hidden rounded-xl ring-1 ring-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-4 py-3 w-8">
                    <Checkbox
                      checked={pendingDrivers.length > 0 && selected.size === pendingDrivers.length}
                      onCheckedChange={toggleAll}
                      aria-label="Tout sélectionner"
                    />
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Chauffeur</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Contact</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Véhicule</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">SIRET</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selected.has(driver.id)}
                        onCheckedChange={() => toggleSelected(driver.id)}
                        aria-label={`Sélectionner ${driver.profiles?.full_name ?? "ce chauffeur"}`}
                      />
                    </td>
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{driver.profiles?.full_name ?? "—"}</td>
                    <td className="px-5 py-4 text-gray-500">
                      <div>{driver.profiles?.email}</div>
                      {driver.profiles?.phone && <div>{driver.profiles.phone}</div>}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {driver.vehicle_type === "taxi" ? "Taxi" : driver.vehicle_type === "vsl" ? "VSL" : "Ambulance"}
                      {driver.pmr_equipped && " · PMR"}
                      <div className="text-xs text-gray-400">{driver.vehicle_registration}</div>
                      {driver.parking_municipality && <div className="text-xs text-gray-400">{driver.parking_municipality}</div>}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {driver.siret}
                      {driver.company_name && <div className="text-xs text-gray-400">{driver.company_name}</div>}
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
        </>
      )}

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approuver {selected.size} candidature{selected.size > 1 ? "s" : ""} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Chaque chauffeur sélectionné pourra se connecter et accepter des courses immédiatement. Un email de confirmation sera envoyé à chacun.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={isBulkApproving} onClick={() => bulkApprove(Array.from(selected))}>
              {isBulkApproving ? "Approbation…" : "Approuver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approuver ce chauffeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {approveTarget?.profiles?.full_name} pourra se connecter et accepter des courses immédiatement. Un email de confirmation lui sera envoyé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={isApproving} onClick={() => approveTarget && approve(approveTarget.id)}>
              {isApproving ? "Approbation…" : "Approuver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}
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
              onClick={() => rejectTarget && reject({ driverDetailsId: rejectTarget.id, reason: rejectReason.trim() })}
            >
              {isRejecting ? "Refus…" : "Refuser la candidature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Répertoire ──────────────────────────────────────────────────────────────

async function fetchDirectory() {
  return adminDriversRepository.fetchDriverDirectory(supabase);
}

function RepertoireTab() {
  const [detailDriver, setDetailDriver] = useState<AdminDriverDirectoryRow | null>(null);

  const { data: drivers, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-driver-directory"],
    queryFn: fetchDirectory,
  });

  const weakSignals = (drivers ?? []).filter(isWeakSignal);

  return (
    <div>
      {isError ? (
        <AdminErrorState message="Impossible de charger le répertoire chauffeurs." onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-gray-400">Chargement…</p>
      ) : !drivers || drivers.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-400 ring-1 ring-gray-100">
          Aucun chauffeur actif pour le moment.
        </div>
      ) : (
        <>
          {weakSignals.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                <h2 className="text-sm font-bold text-amber-900">
                  {weakSignals.length} signal{weakSignals.length > 1 ? "aux" : ""} faible{weakSignals.length > 1 ? "s" : ""} à surveiller
                </h2>
              </div>
              <ul className="flex flex-wrap gap-2">
                {weakSignals.map((d) => (
                  <li key={d.profile_id}>
                    <button
                      type="button"
                      onClick={() => setDetailDriver(d)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      {d.full_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mobile: stacked cards */}
          <ul className="flex flex-col gap-2 sm:hidden">
            {drivers.map((driver) => {
              const suspended = !!driver.pool_suspended_until && new Date(driver.pool_suspended_until) > new Date();
              return (
                <li key={driver.profile_id}>
                  <button
                    type="button"
                    onClick={() => setDetailDriver(driver)}
                    className="w-full rounded-xl bg-white p-4 text-left ring-1 ring-gray-100 hover:ring-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0B0F1C]">
                        {driver.full_name}
                        {isWeakSignal(driver) && (
                          <AlertTriangle className="inline-block h-3.5 w-3.5 text-amber-500 ml-1.5 -mt-0.5" aria-hidden="true" />
                        )}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", suspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                        {suspended ? "Suspendu" : "Actif"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {driver.vehicle_type === "taxi" ? "Taxi" : driver.vehicle_type === "vsl" ? "VSL" : "Ambulance"} — {driver.vehicle_registration}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {driver.average_rating != null ? `★ ${driver.average_rating}` : "Pas encore noté"} · {driver.completed_rides} course{driver.completed_rides > 1 ? "s" : ""} terminée{driver.completed_rides > 1 ? "s" : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden sm:block overflow-hidden rounded-xl ring-1 ring-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Chauffeur</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Véhicule</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Note</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Courses</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((driver) => {
                  const suspended = !!driver.pool_suspended_until && new Date(driver.pool_suspended_until) > new Date();
                  return (
                    <tr
                      key={driver.profile_id}
                      onClick={() => setDetailDriver(driver)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 font-medium text-[#0B0F1C]">
                        {driver.full_name}
                        {isWeakSignal(driver) && (
                          <AlertTriangle className="inline-block h-3.5 w-3.5 text-amber-500 ml-1.5 -mt-0.5" aria-hidden="true" />
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {driver.vehicle_type === "taxi" ? "Taxi" : driver.vehicle_type === "vsl" ? "VSL" : "Ambulance"}
                        <div className="text-xs text-gray-400">{driver.vehicle_registration}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {driver.average_rating != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                            {driver.average_rating}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{driver.completed_rides}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            suspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {suspended ? "Suspendu" : "Actif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailDriver && (
        <DriverDetailDialog driver={detailDriver} onClose={() => setDetailDriver(null)} />
      )}
    </div>
  );
}

function DriverDetailDialog({ driver, onClose }: { driver: AdminDriverDirectoryRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [documentMessage, setDocumentMessage] = useState("");
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const suspended = !!driver.pool_suspended_until && new Date(driver.pool_suspended_until) > new Date();

  // Détail des annulations — pour arbitrer une suspension (suspicious_
  // cancellation_count ci-dessous n'est qu'un compteur brut) plutôt que de
  // se fier aveuglément au seul critère temporel automatique.
  const { data: cancellations } = useQuery({
    queryKey: ["admin-driver-cancellations", driver.profile_id],
    queryFn: () => adminDriversRepository.fetchDriverCancellations(supabase, driver.profile_id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-driver-directory"] });

  const { mutate: suspend, isPending: isSuspending } = useMutation({
    mutationFn: () => adminDriversRepository.suspendDriver(supabase, driver.profile_id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Chauffeur suspendu", description: "Il n'apparaît plus dans le pool de courses.", variant: "success" });
      onClose();
    },
    onError: () => toast({ title: "Échec de la suspension", variant: "error" }),
  });

  const { mutate: reactivate, isPending: isReactivating } = useMutation({
    mutationFn: () => adminDriversRepository.reactivateDriver(supabase, driver.profile_id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Chauffeur réactivé", variant: "success" });
      onClose();
    },
    onError: () => toast({ title: "Échec de la réactivation", variant: "error" }),
  });

  const { mutate: requestDocument, isPending: isRequestingDocument } = useMutation({
    mutationFn: (message: string) =>
      notifyDriverDocumentRequestServerFn({ data: { driverProfileId: driver.profile_id, message } }),
    onSuccess: (sent) => {
      toast({
        title: sent ? "Demande envoyée" : "Email non envoyé",
        variant: sent ? "success" : "error",
      });
      setShowDocumentForm(false);
      setDocumentMessage("");
    },
    onError: () => toast({ title: "Échec de l'envoi", variant: "error" }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {showDocumentForm ? (
          <>
            <DialogHeader>
              <DialogTitle>Demander une mise à jour de documents</DialogTitle>
              <DialogDescription>Un email sera envoyé à {driver.full_name}.</DialogDescription>
            </DialogHeader>
            <Textarea
              value={documentMessage}
              onChange={(e) => setDocumentMessage(e.target.value)}
              placeholder="Ex : votre attestation d'assurance a expiré, merci de nous transmettre la version à jour."
              rows={3}
              aria-label="Message au chauffeur"
            />
            <DialogFooter>
              <button type="button" onClick={() => setShowDocumentForm(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Retour
              </button>
              <button
                type="button"
                disabled={isRequestingDocument || documentMessage.trim().length === 0}
                onClick={() => requestDocument(documentMessage.trim())}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B0F1C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1244E8] disabled:opacity-50 transition-colors"
              >
                <FileWarning className="h-4 w-4" aria-hidden="true" />
                {isRequestingDocument ? "Envoi…" : "Envoyer la demande"}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{driver.full_name}</DialogTitle>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", suspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                  {suspended ? "Suspendu" : "Actif"}
                </span>
              </div>
              <DialogDescription>{driver.email} {driver.phone && `· ${driver.phone}`}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Véhicule</div>
                <div className="mt-0.5 text-[#0B0F1C]">{driver.vehicle_registration}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Note moyenne</div>
                <div className="mt-0.5 text-[#0B0F1C]">{driver.average_rating ?? "—"}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Courses terminées</div>
                <div className="mt-0.5 text-[#0B0F1C]">{driver.completed_rides}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Annulations suspectes</div>
                <div className="mt-0.5 text-[#0B0F1C]">{driver.suspicious_cancellation_count}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Abonnement</div>
                <div className="mt-0.5 text-[#0B0F1C]">{driver.subscription_status}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Disponibilité</div>
                <div className="mt-0.5 text-[#0B0F1C]">{driver.availability}</div>
              </div>
            </div>

            {cancellations && cancellations.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                  Historique des annulations ({cancellations.length})
                </div>
                <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 -mx-1">
                  {cancellations.map((c) => (
                    <li key={`${c.booking_id}-${c.cancelled_at}`} className="px-1 py-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-[#0B0F1C] truncate">
                          {c.bookings?.pickup_address ?? "Course introuvable"}
                        </span>
                        {c.was_suspicious && (
                          <span className="shrink-0 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
                            Suspecte
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 mt-0.5">
                        {c.bookings?.pickup_datetime
                          ? `Course du ${formatDateFr(c.bookings.pickup_datetime)} à ${formatTimeFr(c.bookings.pickup_datetime)} — `
                          : ""}
                        annulée le {formatDateFr(c.cancelled_at)} à {formatTimeFr(c.cancelled_at)}
                      </p>
                      <p className="text-gray-600 mt-0.5">Motif : {c.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowDocumentForm(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileWarning className="h-4 w-4" aria-hidden="true" />
                Demander un document
              </button>
              {suspended ? (
                <button
                  type="button"
                  disabled={isReactivating}
                  onClick={() => reactivate()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {isReactivating ? "Réactivation…" : "Réactiver"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSuspending}
                  onClick={() => suspend()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <PauseCircle className="h-4 w-4" aria-hidden="true" />
                  {isSuspending ? "Suspension…" : "Suspendre"}
                </button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
