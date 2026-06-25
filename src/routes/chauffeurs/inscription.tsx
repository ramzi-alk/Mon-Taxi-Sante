import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, User, Mail, Lock, Phone, Car, FileText } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import { lookupCompanyBySiret, SiretNotFoundError, SirenRateLimitedError, type CompanyInfo } from "~/lib/siren";

export const Route = createFileRoute("/chauffeurs/inscription")({
  head: () => ({
    meta: [
      { title: "Devenir chauffeur conventionné — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Rejoignez le réseau Mon Taxi Santé : chauffeurs de taxi et VSL conventionnés Assurance Maladie. Inscription en ligne, validation par notre équipe.",
      },
    ],
  }),
  component: InscriptionChauffeurPage,
});

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;
const siretRegex = /^\d{14}$/;

const inscriptionSchema = z.object({
  full_name: z.string().min(3, "Veuillez saisir votre nom complet"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  phone: z.string().regex(frenchPhone, "Numéro de téléphone français invalide"),
  siret: z.string().regex(siretRegex, "Le SIRET doit contenir 14 chiffres"),
  vehicle_type: z.enum(["taxi", "vsl", "ambulance"]),
  vehicle_registration: z.string().min(4, "Plaque d'immatriculation requise"),
  pmr_equipped: z.boolean(),
});

type InscriptionSchema = z.infer<typeof inscriptionSchema>;

type SiretLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; company: CompanyInfo }
  | { status: "not_found" }
  | { status: "rate_limited" }
  | { status: "error" };

async function registerDriver(data: InscriptionSchema, companyName: string | null) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name, role: "driver" },
    },
  });
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

  const { error: detailsError } = await supabase.from("drivers_details").insert({
    profile_id: userId,
    siret: data.siret,
    company_name: companyName,
    convention_cpam: false,
    convention_number: null,
    vehicle_type: data.vehicle_type,
    vehicle_registration: data.vehicle_registration,
    pmr_equipped: data.pmr_equipped,
    subscription_status: "trial",
    subscription_ends_at: null,
    approved_at: null,
  });
  if (detailsError) {
    logger.error("driver.register details insert failed", {
      error: detailsError.message,
      userId,
    });
    throw new Error(detailsError.message);
  }
}

function InscriptionChauffeurPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [siretLookup, setSiretLookup] = useState<SiretLookupState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InscriptionSchema>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: { vehicle_type: "taxi", pmr_equipped: false },
  });

  const siret = watch("siret");

  useEffect(() => {
    if (!/^\d{14}$/.test(siret ?? "")) {
      setSiretLookup({ status: "idle" });
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSiretLookup({ status: "loading" });
      try {
        const company = await lookupCompanyBySiret(siret, controller.signal);
        setSiretLookup({ status: "success", company });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (err instanceof SiretNotFoundError) {
          setSiretLookup({ status: "not_found" });
        } else if (err instanceof SirenRateLimitedError) {
          logger.warn("siret_lookup.rate_limited");
          setSiretLookup({ status: "rate_limited" });
        } else {
          logger.warn("siret_lookup.fetch_failed", { error: (err as Error).message });
          setSiretLookup({ status: "error" });
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [siret]);

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (data: InscriptionSchema) =>
      registerDriver(data, siretLookup.status === "success" ? siretLookup.company.name : null),
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(data: InscriptionSchema) {
    if (siretLookup.status === "not_found") {
      setErrorMessage("Le numéro SIRET saisi n'a pas été trouvé. Vérifiez-le avant de continuer.");
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
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ex : Karim Benali"
                  aria-invalid={!!errors.full_name}
                  {...register("full_name")}
                  className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
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
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.fr"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                  className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
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
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
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
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                  className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
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
                Numéro SIRET <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <input
                  id="siret"
                  type="text"
                  inputMode="numeric"
                  placeholder="12345678901234"
                  aria-invalid={!!errors.siret || siretLookup.status === "not_found"}
                  aria-describedby="siret-status"
                  {...register("siret")}
                  className="w-full rounded-xl border border-input bg-white pl-11 pr-10 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
                />
                {siretLookup.status === "loading" && (
                  <Loader2
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              {errors.siret && <p role="alert" className="text-sm text-red-600">{errors.siret.message}</p>}
              <p id="siret-status" role="status" className="text-sm">
                {siretLookup.status === "success" && (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {siretLookup.company.name}
                    {!siretLookup.company.active && " (établissement fermé)"}
                  </span>
                )}
                {siretLookup.status === "not_found" && (
                  <span className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    SIRET introuvable. Vérifiez le numéro saisi.
                  </span>
                )}
                {siretLookup.status === "rate_limited" && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Service de vérification surchargé, réessayez dans un instant.
                  </span>
                )}
              </p>
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
              <input
                id="vehicle_registration"
                type="text"
                placeholder="AB-123-CD"
                aria-invalid={!!errors.vehicle_registration}
                {...register("vehicle_registration")}
                className="w-full rounded-xl border border-input bg-white px-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
              />
              {errors.vehicle_registration && (
                <p role="alert" className="text-sm text-red-600">{errors.vehicle_registration.message}</p>
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
