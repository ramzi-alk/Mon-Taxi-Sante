import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Phone } from "lucide-react";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as siteSettingsRepository from "~/repositories/siteSettingsRepository";
import { AdminErrorState } from "~/components/admin/AdminErrorState";
import { useToast } from "~/components/ui/toast";
import { Checkbox } from "~/components/ui/checkbox";

export const Route = createFileRoute("/admin/parametres")({
  head: () => ({
    meta: [{ title: "Paramètres — Administration — Docteur Taxi" }],
  }),
  component: AdminParametresPage,
});

function AdminParametresPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => siteSettingsRepository.fetchSiteSettings(supabase),
  });

  const { mutate: setPhoneVisible, isPending } = useMutation({
    mutationFn: async (visible: boolean) => {
      const user = await authRepository.getCurrentUser(supabase);
      return siteSettingsRepository.updatePhoneVisibility(supabase, visible, user?.id ?? null);
    },
    onSuccess: (_data, visible) => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({
        title: visible ? "Numéro de téléphone réaffiché" : "Numéro de téléphone masqué",
        description: visible
          ? "Le numéro standard est de nouveau visible sur toutes les pages du site."
          : "Le numéro standard n'apparaît plus sur le site public.",
        variant: "success",
      });
    },
    onError: () => toast({ title: "Échec de la mise à jour", variant: "error" }),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Settings className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Paramètres du site</h1>
      </div>

      {isError ? (
        <AdminErrorState message="Impossible de charger les paramètres." onRetry={() => refetch()} />
      ) : (
        <div className="rounded-xl bg-white p-5 ring-1 ring-gray-100">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-[#1244E8] mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={settings?.phone_number_visible ?? true}
                  disabled={isLoading || isPending}
                  onCheckedChange={(checked) => setPhoneVisible(checked === true)}
                />
                <span className="font-semibold text-[#0B0F1C]">
                  Afficher le numéro de téléphone sur le site
                </span>
              </label>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Contrôle l&apos;affichage du numéro standard ({" "}
                <span className="font-mono">06 02 12 19 07</span>) sur l&apos;ensemble des
                pages publiques (en-tête, pied de page, accueil, pages villes/hôpitaux/ALD,
                FAQ, CGV, mentions légales, suivi de réservation…). Quand il est désactivé,
                ces pages redirigent vers le formulaire de réservation en ligne ou l&apos;email
                de contact à la place.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
