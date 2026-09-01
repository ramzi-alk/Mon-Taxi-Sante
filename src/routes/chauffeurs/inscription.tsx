import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, CheckCircle2, User, Mail, Lock, Phone, Car, MapPin } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import * as authRepository from "~/repositories/authRepository";
import { submitDriverApplicationServerFn } from "~/server/drivers";
import { SiretAutocomplete } from "~/components/chauffeurs/SiretAutocomplete";
import { AddressAutocomplete } from "~/components/booking/AddressAutocomplete";
import { Input } from "~/components/ui/input";
import type { CompanySuggestion } from "~/lib/siren";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute("/chauffeurs/inscription")({
  head: () => ({
    meta: [
      { title: "Devenir chauffeur conventionné — Docteur Taxi" },
      {
        name: "description",
        content:
          "Rejoignez le réseau Docteur Taxi : chauffeurs de taxi et VSL conventionnés Assurance Maladie. Inscription en ligne, validation par notre équipe.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/chauffeurs/inscription"),
  }),
  component: InscriptionChauffeurPage,
});

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;

const inscriptionSchema = z.object({
  full_name: z.string().min(3, "Veuillez saisir votre nom complet"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  phone: z.string().regex(frenchPhone, "Numéro de téléphone français invalide"),
  vehicle_type: z.enum(["taxi", "vsl", "ambulance"]),
  vehicle_registration: z.string().min(4, "Plaque d'immatriculation requise"),
  pmr_equipped: z.boolean(),
  parking_municipality: z.string().min(2, "Veuillez indiquer votre commune de stationnement"),
  parking_lat: z.number().nullable(),
  parking_lng: z.number().nullable(),
});

type InscriptionSchema = z.infer<typeof inscriptionSchema>;

async function registerDriver(data: InscriptionSchema, company: CompanySuggestion) {
  const { data: signUpData, error: signUpError } = await authRepository.signUp(
    supabase,
    data.email,
    data.password,
    { full_name: data.full_name, role: "driver" }
  );
  if (signUpError) {
    logger.error("driver.register signup failed", { error: signUpError.message });
    throw new Error(signUpError.message);
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    throw new Error(
      "Compte créé. Vérifiez votre email pour confirmer votre inscription, puis reconnectez-vous pour finaliser votre dossier."
    );
  }

  await submitDriverApplicationServerFn({
    data: {
      profile_id: userId,
      phone: data.phone,
      siret: company.siret,
      company_name: company.name,
      vehicle_type: data.vehicle_type,
      vehicle_registration: data.vehicle_registration,
      pmr_equipped: data.pmr_equipped,
      parking_municipality: data.parking_municipality,
      parking_lat: data.parking_lat,
      parking_lng: data.parking_lng,
    },
  });
}

function InscriptionChauffeurPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [siretQuery, setSiretQuery] = useState("");
  const [company, setCompany] = useState<CompanySuggestion | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<InscriptionSchema>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: {
      vehicle_type: "taxi",
      pmr_equipped: false,
      parking_municipality: "",
      parking_lat: null,
      parking_lng: null,
    },
  });
  const parkingMunicipality = watch("parking_municipality");

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (data: InscriptionSchema) => registerDriver(data, company as CompanySuggestion),
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(data: InscriptionSchema) {
    if (!company) {
      setErrorMessage(
        "Recherchez votre entreprise par nom ou par SIRET, puis sélectionnez-la dans la liste avant de continuer."
      );
      return;
    }
    setErrorMessage(null);
    mutate(data);
  }

  if (isSuccess) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-20 md:py-28 max-w-md text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-black tracking-tight text-[#0B0F1C]">
            Candidature envoyée
          </h1>
          <p className="mt-4 text-gray-500 leading-relaxed">
            Merci pour votre inscription. Votre dossier est en cours de
            validation par notre équipe. Vous recevrez un email de
            confirmation dès que votre compte sera activé.
          </p>
          <Link to="/" className="btn-cta mt-8 inline-flex bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors">
            Retour à l'accueil
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Rejoindre le réseau
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Devenez chauffeur conventionné
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Rejoignez un réseau de chauffeurs de taxi et VSL conventionnés
            Assurance Maladie. Recevez des courses qualifiées directement sur votre
            tableau de bord.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FC]">
        <div className="container py-16 md:py-20 max-w-2xl">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label="Formulaire d'inscription chauffeur"
            className="rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100 space-y-6"
          >
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700"
              >
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                {errorMessage}
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-gray-900">Vos informations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Identité et accès à votre futur espace chauffeur.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700">
                Nom complet <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ex : Karim Benali"
                  aria-invalid={!!errors.full_name}
                  {...register("full_name")}
                  className="pl-11 pr-4 py-3.5 text-base"
                />
              </div>
              {errors.full_name && <p role="alert" className="text-sm text-red-600">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Adresse email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.fr"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                  className="pl-11 pr-4 py-3.5 text-base"
                />
              </div>
              {errors.email && <p role="alert" className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Mot de passe <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  className="pl-11 pr-4 py-3.5 text-base"
                />
              </div>
              {errors.password && <p role="alert" className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                Téléphone <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                  className="pl-11 pr-4 py-3.5 text-base"
                />
              </div>
              {errors.phone && <p role="alert" className="text-sm text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-xl font-bold text-gray-900">Votre activité</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Informations nécessaires à la vérification de votre conventionnement.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="siret" className="block text-sm font-semibold text-gray-700">
                SIRET <span className="text-red-500" aria-hidden="true">*</span>{" "}
                <span className="font-normal text-muted-foreground">(recherche automatique)</span>
              </label>
              <SiretAutocomplete
                id="siret"
                value={siretQuery}
                onChange={(v) => {
                  setSiretQuery(v);
                  setCompany(null);
                }}
                onSelect={(selected) => setCompany(selected)}
                placeholder="Nom de l'entreprise ou numéro SIRET"
                ariaDescribedBy="siret-status"
                ariaInvalid={!company && siretQuery.length > 0}
              />
              {company && (
                <p id="siret-status" role="status" className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {company.address}
                  {!company.active && " — établissement fermé"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="vehicle_type" className="block text-sm font-semibold text-gray-700">
                Type de véhicule <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <select
                  id="vehicle_type"
                  {...register("vehicle_type")}
                  className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none"
                >
                  <option value="taxi">Taxi conventionné</option>
                  <option value="vsl">VSL (Véhicule Sanitaire Léger)</option>
                  <option value="ambulance">Ambulance</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="vehicle_registration" className="block text-sm font-semibold text-gray-700">
                Plaque d'immatriculation <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <Input
                id="vehicle_registration"
                type="text"
                placeholder="AB-123-CD"
                aria-invalid={!!errors.vehicle_registration}
                {...register("vehicle_registration")}
                className="py-3.5 text-base"
              />
              {errors.vehicle_registration && (
                <p role="alert" className="text-sm text-red-600">{errors.vehicle_registration.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="parking_municipality" className="block text-sm font-semibold text-gray-700">
                Commune de stationnement <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <AddressAutocomplete
                id="parking_municipality"
                type="municipality"
                value={parkingMunicipality}
                onChange={(val) => setValue("parking_municipality", val)}
                onSelect={(suggestion) => {
                  setValue("parking_municipality", suggestion.label);
                  setValue("parking_lat", suggestion.lat);
                  setValue("parking_lng", suggestion.lng);
                  trigger("parking_municipality");
                }}
                onBlur={() => trigger("parking_municipality")}
                placeholder="Ex : Lyon"
                icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
                ariaInvalid={!!errors.parking_municipality}
                ariaRequired
              />
              {errors.parking_municipality && (
                <p role="alert" className="text-sm text-red-600">{errors.parking_municipality.message}</p>
              )}
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                {...register("pmr_equipped")}
                className="h-5 w-5 rounded border-input text-[#1244E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              Mon véhicule est équipé pour le transport PMR (fauteuil roulant)
            </label>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
              <strong>Validation manuelle&nbsp;:</strong> Votre dossier sera
              examiné par notre équipe (conventionnement Assurance Maladie, documents
              justificatifs) avant activation de votre compte chauffeur.
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-cta w-full justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "Envoi en cours…" : "Envoyer ma candidature"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà inscrit ?{" "}
            <Link to="/connexion" className="text-[#1244E8] font-semibold underline">
              Se connecter
            </Link>
            {" · "}
            <Link to="/chauffeurs/tarifs" className="text-[#1244E8] font-semibold underline">
              Voir nos tarifs d'abonnement
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
