import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, CheckCircle2, Clock, Users, Car, ClipboardList } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as profilesRepository from "~/repositories/profilesRepository";
import * as driversRepository from "~/repositories/driversRepository";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { PendingDriver } from "~/repositories/driversRepository";
import { notifyDriverApprovedServerFn } from "~/server/email";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Mon Taxi Santé" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

async function fetchCurrentRole(): Promise<"admin" | "driver" | "patient" | null> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) return null;
  return profilesRepository.getProfileRole(supabase, user.id);
}

async function fetchPendingDrivers(): Promise<PendingDriver[]> {
  return driversRepository.fetchPendingDrivers(supabase);
}

async function fetchBookingStats(): Promise<Record<string, number>> {
  return bookingsRepository.fetchBookingStatusCounts(supabase);
}

async function approveDriver(driverDetailsId: string) {
  const user = await authRepository.getCurrentUser(supabase);
  await driversRepository.approveDriver(supabase, driverDetailsId, user?.id ?? null);
  await notifyDriverApprovedServerFn({ data: { driverDetailsId } });
}

function AdminPage() {
  const { data: role, isLoading: isLoadingRole } = useQuery({
    queryKey: ["current-role"],
    queryFn: fetchCurrentRole,
  });

  if (isLoadingRole) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-24 text-center text-gray-400">Chargement…</div>
      </section>
    );
  }

  if (role !== "admin") {
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

function AdminDashboard() {
  const queryClient = useQueryClient();

  const { data: pendingDrivers, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["admin-pending-drivers"],
    queryFn: fetchPendingDrivers,
  });

  const { data: bookingStats } = useQuery({
    queryKey: ["admin-booking-stats"],
    queryFn: fetchBookingStats,
  });

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: approveDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-drivers"] });
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

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
            <h2 className="text-xl font-bold text-[#0B0F1C]">
              Candidatures chauffeurs en attente
            </h2>
          </div>

          {isLoadingDrivers ? (
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
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => approve(driver.id)}
                          disabled={isApproving}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          Approuver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
