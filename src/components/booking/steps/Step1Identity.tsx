import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { User, Phone, Mail, Heart, UserCheck } from "lucide-react";
import type { BookingSchema } from "../schema";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

export function Step1Identity({ form }: StepProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const bookingForOther = watch("booking_for_other");
  const bookerPhone = watch("booker_phone");
  const [patientHasNoPhone, setPatientHasNoPhone] = useState(false);

  // Certains patients âgés n'ont pas de téléphone propre : le numéro du
  // réservateur (rempli plus bas) sert alors aussi de contact patient,
  // au lieu de bloquer la soumission faute d'un second numéro à saisir.
  useEffect(() => {
    if (bookingForOther && patientHasNoPhone) {
      setValue("patient_phone", bookerPhone || "", { shouldValidate: true });
    }
  }, [bookingForOther, patientHasNoPhone, bookerPhone, setValue]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Informations du patient</h2>
        <p className="mt-1 text-muted-foreground">
          Ces informations permettent au chauffeur d&apos;identifier le patient à la prise en charge.
        </p>
      </div>

      {/* Who is booking toggle */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Cette réservation concerne&nbsp;:</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("booking_for_other", false, { shouldValidate: true })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !bookingForOther
                ? "border-brand-blue-600 bg-brand-blue-50 text-brand-blue-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
            )}
            aria-pressed={!bookingForOther}
          >
            <UserCheck
              className={cn("h-6 w-6", !bookingForOther ? "text-brand-blue-600" : "text-gray-400")}
              aria-hidden="true"
            />
            <span>Moi-même</span>
          </button>
          <button
            type="button"
            onClick={() => setValue("booking_for_other", true, { shouldValidate: true })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              bookingForOther
                ? "border-brand-blue-600 bg-brand-blue-50 text-brand-blue-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
            )}
            aria-pressed={bookingForOther}
          >
            <Heart
              className={cn("h-6 w-6", bookingForOther ? "text-brand-blue-600" : "text-gray-400")}
              aria-hidden="true"
            />
            <span>Un proche</span>
          </button>
        </div>
      </div>

      {/* Context banner when booking for someone else */}
      {bookingForOther && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 text-sm text-amber-800 leading-relaxed">
          <strong>Vous réservez pour un proche.</strong> Renseignez d&apos;abord les informations
          de la <strong>personne qui va voyager</strong>, puis vos propres coordonnées
          pour recevoir la confirmation.
        </div>
      )}

      {/* Patient section */}
      <div className="space-y-5">
        {bookingForOther && (
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">
              Le patient (qui va voyager)
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        )}

        {/* Full name */}
        <div className="space-y-1.5">
          <label
            htmlFor="patient_full_name"
            className="block text-sm font-semibold text-gray-700"
          >
            Nom complet du patient{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="patient_full_name"
              type="text"
              autoComplete={bookingForOther ? "off" : "name"}
              placeholder="Ex : Marie Dupont"
              aria-required="true"
              aria-describedby={errors.patient_full_name ? "name-error" : undefined}
              {...register("patient_full_name")}
              className="pl-11 pr-4 py-3.5 text-base"
              aria-invalid={!!errors.patient_full_name}
            />
          </div>
          {errors.patient_full_name && (
            <p id="name-error" role="alert" className="text-sm text-red-600">
              {errors.patient_full_name.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label
            htmlFor="patient_phone"
            className="block text-sm font-semibold text-gray-700"
          >
            Numéro de téléphone du patient{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <Phone
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="patient_phone"
              type="tel"
              autoComplete={bookingForOther ? "off" : "tel"}
              placeholder="06 12 34 56 78"
              aria-required="true"
              aria-describedby={errors.patient_phone ? "phone-error" : "phone-hint"}
              disabled={bookingForOther && patientHasNoPhone}
              {...register("patient_phone")}
              className="pl-11 pr-4 py-3.5 text-base"
              aria-invalid={!!errors.patient_phone}
            />
          </div>
          <p id="phone-hint" className="text-xs text-muted-foreground">
            {bookingForOther
              ? "Utilisé par le chauffeur pour contacter le patient le jour du transport."
              : "Utilisé pour la confirmation de la réservation et le contact chauffeur."}
          </p>
          {errors.patient_phone && (
            <p id="phone-error" role="alert" className="text-sm text-red-600">
              {errors.patient_phone.message}
            </p>
          )}
          {bookingForOther && (
            <label htmlFor="patient_has_no_phone" className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <Checkbox
                id="patient_has_no_phone"
                checked={patientHasNoPhone}
                onCheckedChange={(checked) => setPatientHasNoPhone(checked === true)}
              />
              <span className="text-sm text-muted-foreground">
                Le patient n&apos;a pas de téléphone (utiliser le vôtre, renseigné plus bas)
              </span>
            </label>
          )}
        </div>

        {/* Email — only shown when booking for self */}
        {!bookingForOther && (
          <div className="space-y-1.5">
            <label
              htmlFor="patient_email"
              className="block text-sm font-semibold text-gray-700"
            >
              Adresse email{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="patient_email"
                type="email"
                autoComplete="email"
                placeholder="marie.dupont@email.fr"
                aria-required="true"
                aria-describedby={errors.patient_email ? "email-error" : "email-hint"}
                {...register("patient_email")}
                className="pl-11 pr-4 py-3.5 text-base"
                aria-invalid={!!errors.patient_email}
              />
            </div>
            <p id="email-hint" className="text-xs text-muted-foreground">
              Utilisée pour vous envoyer la confirmation de réservation.
            </p>
            {errors.patient_email && (
              <p id="email-error" role="alert" className="text-sm text-red-600">
                {errors.patient_email.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Booker section — shown only when booking for someone else */}
      {bookingForOther && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">
              Vos coordonnées (réservateur)
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="text-sm text-muted-foreground -mt-2">
            Vous recevrez la confirmation de réservation à ces coordonnées.
          </p>

          {/* Booker name */}
          <div className="space-y-1.5">
            <label
              htmlFor="booker_full_name"
              className="block text-sm font-semibold text-gray-700"
            >
              Votre prénom et nom{" "}
              <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <User
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="booker_full_name"
                type="text"
                autoComplete="name"
                placeholder="Ex : Jean Dupont"
                {...register("booker_full_name")}
                className="pl-11 pr-4 py-3.5 text-base"
              />
            </div>
          </div>

          {/* Booker phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="booker_phone"
              className="block text-sm font-semibold text-gray-700"
            >
              Votre numéro de téléphone{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Phone
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="booker_phone"
                type="tel"
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                aria-required="true"
                aria-describedby={errors.booker_phone ? "booker-phone-error" : "booker-phone-hint"}
                {...register("booker_phone")}
                className="pl-11 pr-4 py-3.5 text-base"
                aria-invalid={!!errors.booker_phone}
              />
            </div>
            <p id="booker-phone-hint" className="text-xs text-muted-foreground">
              Contact secondaire pour le chauffeur en cas de besoin.
            </p>
            {errors.booker_phone && (
              <p id="booker-phone-error" role="alert" className="text-sm text-red-600">
                {errors.booker_phone.message}
              </p>
            )}
          </div>

          {/* Booker email */}
          <div className="space-y-1.5">
            <label
              htmlFor="booker_email"
              className="block text-sm font-semibold text-gray-700"
            >
              Votre adresse email{" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="booker_email"
                type="email"
                autoComplete="email"
                placeholder="jean.dupont@email.fr"
                aria-required="true"
                aria-describedby={errors.booker_email ? "booker-email-error" : "booker-email-hint"}
                {...register("booker_email")}
                className="pl-11 pr-4 py-3.5 text-base"
                aria-invalid={!!errors.booker_email}
              />
            </div>
            <p id="booker-email-hint" className="text-xs text-muted-foreground">
              La confirmation de réservation sera envoyée à cette adresse.
            </p>
            {errors.booker_email && (
              <p id="booker-email-error" role="alert" className="text-sm text-red-600">
                {errors.booker_email.message}
              </p>
            )}
          </div>

          {/* Hidden patient email — prefilled to patient phone domain or left empty */}
          {/* patient_email is still required by schema; hide it here and ask patient's email too */}
          <div className="space-y-1.5">
            <label
              htmlFor="patient_email"
              className="block text-sm font-semibold text-gray-700"
            >
              Email du patient{" "}
              <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="patient_email"
                type="email"
                autoComplete="off"
                placeholder="marie.dupont@email.fr (si connue)"
                aria-describedby={errors.patient_email ? "patient-email-third-error" : "patient-email-third-hint"}
                {...register("patient_email")}
                className="pl-11 pr-4 py-3.5 text-base"
                aria-invalid={!!errors.patient_email}
              />
            </div>
            <p id="patient-email-third-hint" className="text-xs text-muted-foreground">
              Si vous la connaissez, le patient recevra aussi une copie de la confirmation.
            </p>
            {errors.patient_email && (
              <p id="patient-email-third-error" role="alert" className="text-sm text-red-600">
                {errors.patient_email.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Privacy notice */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        <strong>Protection des données&nbsp;:</strong> Ces informations sont
        chiffrées et stockées sur un hébergement de données de santé certifié HDS,
        conformément au RGPD. Elles ne sont jamais revendues.
      </div>
    </div>
  );
}
