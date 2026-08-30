import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, LayoutDashboard, ClipboardList, Users, UserSearch, MessageSquareText, History, ShieldCheck, BarChart3, Settings, Car } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import { checkAdminAccessServerFn } from "~/server/adminAccess";
import { AdminCommandSearch } from "~/components/admin/AdminCommandSearch";
import { AdminNotificationBell } from "~/components/admin/AdminNotificationBell";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Docteur Taxi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
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

const NAV_ITEMS = [
  { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/admin/reservations", label: "Réservations", icon: ClipboardList, exact: false },
  { to: "/admin/chauffeurs", label: "Chauffeurs", icon: Users, exact: false },
  { to: "/admin/patients", label: "Patients", icon: UserSearch, exact: false },
  { to: "/admin/avis", label: "Avis", icon: MessageSquareText, exact: false },
  { to: "/admin/journal", label: "Journal", icon: History, exact: false },
  { to: "/admin/statistiques", label: "Statistiques", icon: BarChart3, exact: false },
  { to: "/admin/securite", label: "Sécurité", icon: ShieldCheck, exact: false },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings, exact: false },
] as const;

function AdminLayout() {
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
            Cette page est réservée aux administrateurs de Docteur Taxi.
          </p>
          <Link
            to="/admin/connexion"
            className="btn-cta mt-8 inline-flex bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </section>
    );
  }

  return <AdminShell />;
}

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-8 md:py-10">
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="min-w-0 md:sticky md:top-24 md:self-start">
            <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4 px-1">
              Administration
            </p>
            <nav className="flex flex-wrap md:flex-col gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-[#0B0F1C] text-white"
                        : "text-gray-500 hover:bg-white hover:text-[#0B0F1C]"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex justify-end md:justify-start items-center gap-2">
              <Link
                to="/tableau-de-bord/chauffeur"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#0B0F1C] transition-colors"
              >
                <Car className="h-4 w-4" aria-hidden="true" />
                Vue tableau de bord
              </Link>
              <AdminCommandSearch />
              <AdminNotificationBell />
            </div>
            <Outlet />
          </div>
        </div>
      </div>
    </section>
  );
}
