import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Lock,
  Car,
  MapPin,
  Building2,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import { formatDateFr } from "~/lib/utils";
import * as authRepository from "~/repositories/authRepository";
import * as profilesRepository from "~/repositories/profilesRepository";
import * as driversRepository from "~/repositories/driversRepository";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { AddressAutocomplete } from "~/components/booking/AddressAutocomplete";
import type { Database } from "~/lib/database.types";

export const Route = createFileRoute("/tableau-de-bord/chauffeur_/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — Docteur Taxi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DriverAccountPage,
});

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchMyProfile(): Promise<profilesRepository.MyProfile | null> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) return null;
  return profilesRepository.fetchMyProfile(supabase, user.id);
}

async function updateMyProfile(fields: { full_name: string; phone: string | null }): Promise<void> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) throw new Error("Non authentifié");
  await profilesRepository.updateMyProfile(supabase, user.id, fields);
}

async function updateMyPassword(password: string): Promise<void> {
  const { error } = await authRepository.updatePassword(supabase, password);
  if (error) throw new Error(error.message);
}

async function fetchMyAccountDetails(): Promise<driversRepository.MyDriverAccount | null> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) return null;
  return driversRepository.fetchMyAccountDetails(supabase, user.id);
}

async function updateMyAccountDetails(
  fields: Parameters<typeof driversRepository.updateMyAccountDetails>[2]
): Promise<void> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) throw new Error("Non authentifié");
  await driversRepository.updateMyAccountDetails(supabase, user.id, fields);
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

const subscriptionLabels: Record<Database["public"]["Enums"]["subscription_status"], string> = {
  trial: "Période d'essai",
  active: "Actif",
  past_due: "Paiement en retard",
  cancelled: "Annulé",
};

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-blue-500" aria-hidden="true" />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground -mt-2">{description}</p>}
      {children}
    </section>
  );
}

function SkeletonSection() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 animate-pulse space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 rounded" />
        <div className="h-5 w-40 bg-gray-200 rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-9 w-full bg-gray-200 rounded-lg" />
        <div className="h-9 w-full bg-gray-200 rounded-lg" />
      </div>
      <div className="h-9 w-28 bg-gray-200 rounded-xl" />
    </div>
  );
}

function SaveButton({ pending, label = "Enregistrer" }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors"
    >
      {pending ? "Enregistrement…" : label}
    </button>
  );
}

// ─── Personal info form ──────────────────────────────────────────────────────

const personalInfoSchema = z.object({
  full_name: z.string().min(3, "Veuillez saisir votre nom complet"),
  phone: z.string().regex(frenchPhone, "Numéro de téléphone français invalide"),
});
type PersonalInfoSchema = z.infer<typeof personalInfoSchema>;

function PersonalInfoCard({ profile }: { profile: profilesRepository.MyProfile }) {
  const queryClient = useQueryClient();
  const [successAt, setSuccessAt] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PersonalInfoSchema>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { full_name: profile.full_name, phone: profile.phone ?? "" },
  });

  useEffect(() => {
    reset({ full_name: profile.full_name, phone: profile.phone ?? "" });
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setSuccessAt(Date.now());
    },
    onError: (error) => {
      logger.error("driver.updateMyProfile failed", { error: error.message });
      alert(`Erreur : ${error.message}`);
    },
  });

  return (
    <Card icon={User} title="Informations personnelles">
      <form
        className="space-y-4"
        onSubmit={handleSubmit((data) => mutation.mutate({ full_name: data.full_name, phone: data.phone }))}
        noValidate
      >
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700">
            Nom complet
          </label>
          <Input id="full_name" type="text" autoComplete="name" aria-invalid={!!errors.full_name} {...register("full_name")} />
          {errors.full_name && <p role="alert" className="text-sm text-red-600">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
            Adresse email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input id="email" type="email" value={profile.email ?? ""} disabled className="pl-10" />
          </div>
          <p className="text-xs text-muted-foreground">L'adresse email ne peut pas être modifiée.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
            Téléphone
          </label>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="06 12 34 56 78" aria-invalid={!!errors.phone} {...register("phone")} />
          {errors.phone && <p role="alert" className="text-sm text-red-600">{errors.phone.message}</p>}
        </div>

        <div className="flex items-center gap-3">
          <SaveButton pending={mutation.isPending} />
          {successAt && !mutation.isPending && (
            <span role="status" className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Enregistré
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

// ─── Password form ───────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type PasswordSchema = z.infer<typeof passwordSchema>;

function PasswordCard() {
  const [successAt, setSuccessAt] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordSchema>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: PasswordSchema) => updateMyPassword(data.password),
    onSuccess: () => {
      reset({ password: "", confirmPassword: "" });
      setSuccessAt(Date.now());
    },
    onError: (error) => {
      logger.error("driver.updateMyPassword failed", { error: error.message });
      alert(`Erreur : ${error.message}`);
    },
  });

  return (
    <Card icon={Lock} title="Mot de passe">
      <form className="space-y-4" onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
            Nouveau mot de passe
          </label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <p role="alert" className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
            Confirmer le mot de passe
          </label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
          {errors.confirmPassword && <p role="alert" className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        <div className="flex items-center gap-3">
          <SaveButton pending={mutation.isPending} label="Changer le mot de passe" />
          {successAt && !mutation.isPending && (
            <span role="status" className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mot de passe mis à jour
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

// ─── Vehicle & equipment form ────────────────────────────────────────────────

const vehicleSchema = z.object({
  vehicle_type: z.enum(["taxi", "vsl", "ambulance"]),
  vehicle_registration: z.string().min(4, "Plaque d'immatriculation requise"),
  vehicle_brand: z.string().nullable(),
  vehicle_model: z.string().nullable(),
  vehicle_year: z.number().nullable(),
  pmr_equipped: z.boolean(),
  stretcher_equipped: z.boolean(),
  oxygen_equipped: z.boolean(),
});
type VehicleSchema = z.infer<typeof vehicleSchema>;

function VehicleCard({ details }: { details: driversRepository.MyDriverAccount }) {
  const queryClient = useQueryClient();
  const [successAt, setSuccessAt] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<VehicleSchema>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_type: details.vehicle_type,
      vehicle_registration: details.vehicle_registration,
      vehicle_brand: details.vehicle_brand,
      vehicle_model: details.vehicle_model,
      vehicle_year: details.vehicle_year,
      pmr_equipped: details.pmr_equipped,
      stretcher_equipped: details.stretcher_equipped,
      oxygen_equipped: details.oxygen_equipped,
    },
  });

  useEffect(() => {
    reset({
      vehicle_type: details.vehicle_type,
      vehicle_registration: details.vehicle_registration,
      vehicle_brand: details.vehicle_brand,
      vehicle_model: details.vehicle_model,
      vehicle_year: details.vehicle_year,
      pmr_equipped: details.pmr_equipped,
      stretcher_equipped: details.stretcher_equipped,
      oxygen_equipped: details.oxygen_equipped,
    });
  }, [details, reset]);

  const mutation = useMutation({
    mutationFn: updateMyAccountDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-account-details"] });
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      setSuccessAt(Date.now());
    },
    onError: (error) => {
      logger.error("driver.updateMyVehicle failed", { error: error.message });
      alert(`Erreur : ${error.message}`);
    },
  });

  return (
    <Card icon={Car} title="Véhicule & équipements">
      <form
        className="space-y-4"
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
      >
        <div className="space-y-1.5">
          <label htmlFor="vehicle_type" className="block text-sm font-semibold text-gray-700">
            Type de véhicule
          </label>
          <Select
            value={watch("vehicle_type")}
            onValueChange={(v) => setValue("vehicle_type", v as VehicleSchema["vehicle_type"])}
          >
            <SelectTrigger id="vehicle_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taxi">Taxi conventionné</SelectItem>
              <SelectItem value="vsl">VSL (Véhicule Sanitaire Léger)</SelectItem>
              <SelectItem value="ambulance">Ambulance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="vehicle_registration" className="block text-sm font-semibold text-gray-700">
            Plaque d'immatriculation
          </label>
          <Input id="vehicle_registration" type="text" aria-invalid={!!errors.vehicle_registration} {...register("vehicle_registration")} />
          {errors.vehicle_registration && (
            <p role="alert" className="text-sm text-red-600">{errors.vehicle_registration.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="vehicle_brand" className="block text-sm font-semibold text-gray-700">
              Marque
            </label>
            <Input
              id="vehicle_brand"
              type="text"
              placeholder="Ex : Peugeot"
              value={watch("vehicle_brand") ?? ""}
              onChange={(e) => setValue("vehicle_brand", e.target.value || null)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="vehicle_model" className="block text-sm font-semibold text-gray-700">
              Modèle
            </label>
            <Input
              id="vehicle_model"
              type="text"
              placeholder="Ex : 5008"
              value={watch("vehicle_model") ?? ""}
              onChange={(e) => setValue("vehicle_model", e.target.value || null)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="vehicle_year" className="block text-sm font-semibold text-gray-700">
              Année
            </label>
            <Input
              id="vehicle_year"
              type="number"
              inputMode="numeric"
              placeholder="Ex : 2022"
              value={watch("vehicle_year") ?? ""}
              onChange={(e) => setValue("vehicle_year", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="flex items-center gap-3 text-sm text-gray-700">
            <Checkbox checked={watch("pmr_equipped")} onCheckedChange={(c) => setValue("pmr_equipped", c === true)} />
            Véhicule équipé pour le transport PMR (fauteuil roulant)
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700">
            <Checkbox checked={watch("stretcher_equipped")} onCheckedChange={(c) => setValue("stretcher_equipped", c === true)} />
            Véhicule équipé pour le transport en brancard
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700">
            <Checkbox checked={watch("oxygen_equipped")} onCheckedChange={(c) => setValue("oxygen_equipped", c === true)} />
            Véhicule équipé d'oxygène médical
          </label>
        </div>

        <div className="flex items-center gap-3">
          <SaveButton pending={mutation.isPending} />
          {successAt && !mutation.isPending && (
            <span role="status" className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Enregistré
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

// ─── Parking address form ────────────────────────────────────────────────────

const parkingSchema = z.object({
  parking_municipality: z.string().min(2, "Veuillez indiquer votre commune de stationnement"),
  parking_lat: z.number().nullable(),
  parking_lng: z.number().nullable(),
});
type ParkingSchema = z.infer<typeof parkingSchema>;

function ParkingCard({ details }: { details: driversRepository.MyDriverAccount }) {
  const queryClient = useQueryClient();
  const [successAt, setSuccessAt] = useState<number | null>(null);
  const {
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<ParkingSchema>({
    resolver: zodResolver(parkingSchema),
    defaultValues: {
      parking_municipality: details.parking_municipality ?? "",
      parking_lat: details.parking_lat,
      parking_lng: details.parking_lng,
    },
  });

  useEffect(() => {
    reset({
      parking_municipality: details.parking_municipality ?? "",
      parking_lat: details.parking_lat,
      parking_lng: details.parking_lng,
    });
  }, [details, reset]);

  const mutation = useMutation({
    mutationFn: updateMyAccountDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-account-details"] });
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      setSuccessAt(Date.now());
    },
    onError: (error) => {
      logger.error("driver.updateMyParking failed", { error: error.message });
      alert(`Erreur : ${error.message}`);
    },
  });

  return (
    <Card
      icon={MapPin}
      title="Stationnement"
      description="Utilisée pour calculer la distance avec les courses du pool et appliquer votre rayon d'acceptation."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
      >
        <div className="space-y-1.5">
          <label htmlFor="parking_municipality" className="block text-sm font-semibold text-gray-700">
            Commune de stationnement
          </label>
          <AddressAutocomplete
            id="parking_municipality"
            type="municipality"
            value={watch("parking_municipality")}
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
          />
          {errors.parking_municipality && (
            <p role="alert" className="text-sm text-red-600">{errors.parking_municipality.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <SaveButton pending={mutation.isPending} />
          {successAt && !mutation.isPending && (
            <span role="status" className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Enregistré
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

// ─── Read-only company / subscription block ─────────────────────────────────

function CompanyCard({ details }: { details: driversRepository.MyDriverAccount }) {
  return (
    <Card icon={Building2} title="Entreprise & abonnement">
      <dl className="grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-muted-foreground">SIRET</dt>
          <dd className="font-medium text-gray-900">{details.siret}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Entreprise</dt>
          <dd className="font-medium text-gray-900">{details.company_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            Abonnement
          </dt>
          <dd className="font-medium text-gray-900">{subscriptionLabels[details.subscription_status]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Échéance</dt>
          <dd className="font-medium text-gray-900">
            {details.subscription_ends_at ? formatDateFr(details.subscription_ends_at) : "—"}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Pour modifier ces informations, contactez notre équipe.
      </p>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DriverAccountPage() {
  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const accountQuery = useQuery({ queryKey: ["my-account-details"], queryFn: fetchMyAccountDetails });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-blue-700 text-white">
        <div className="container py-6">
          <Link
            to="/tableau-de-bord/chauffeur"
            className="inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour au tableau de bord
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Mon compte</h1>
          <p className="text-blue-200 text-sm mt-0.5">
            Gérez vos informations personnelles, votre véhicule et votre stationnement.
          </p>
        </div>
      </div>

      <div className="container py-8 max-w-2xl space-y-6">
        {/* Chargement progressif : chaque section s'affiche dès que sa query est prête */}
        {profileQuery.isLoading ? <SkeletonSection /> : profileQuery.data ? <PersonalInfoCard profile={profileQuery.data} /> : null}
        <PasswordCard />
        {accountQuery.isLoading ? (
          <>
            <SkeletonSection />
            <SkeletonSection />
            <SkeletonSection />
          </>
        ) : accountQuery.data ? (
          <>
            <VehicleCard details={accountQuery.data} />
            <ParkingCard details={accountQuery.data} />
            <CompanyCard details={accountQuery.data} />
          </>
        ) : null}
      </div>
    </div>
  );
}
