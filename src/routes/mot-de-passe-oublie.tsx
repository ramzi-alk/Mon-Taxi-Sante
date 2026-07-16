import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import * as authRepository from "~/repositories/authRepository";
import { Input } from "~/components/ui/input";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Docteur Taxi" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MotDePasseOubliePage,
});

const requestSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type RequestSchema = z.infer<typeof requestSchema>;

async function requestPasswordReset(data: RequestSchema) {
  const redirectTo = `${import.meta.env.VITE_APP_URL as string}/reinitialiser-mot-de-passe`;
  const { error } = await authRepository.resetPasswordForEmail(supabase, data.email, redirectTo);
  if (error) {
    logger.warn("auth.resetPasswordForEmail failed", { error: error.message });
    throw new Error("Impossible d'envoyer l'email pour le moment. Réessayez plus tard.");
  }
}

function MotDePasseOubliePage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestSchema>({
    resolver: zodResolver(requestSchema),
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: requestPasswordReset,
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(data: RequestSchema) {
    setErrorMessage(null);
    mutate(data);
  }

  if (isSuccess) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-20 md:py-28 max-w-md text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-black tracking-tight text-[#0B0F1C]">
            Email envoyé
          </h1>
          <p className="mt-4 text-gray-500 leading-relaxed">
            Si un compte existe avec cette adresse, un lien de réinitialisation
            vient de vous être envoyé. Pensez à vérifier vos spams.
          </p>
          <Link
            to="/connexion"
            className="btn-cta mt-8 inline-flex bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-16 md:py-24 max-w-md">
        <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4 text-center">
          Espace chauffeur
        </p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B0F1C] text-center">
          Mot de passe oublié
        </h1>
        <p className="mt-3 text-gray-500 text-center leading-relaxed">
          Indiquez votre adresse email, nous vous enverrons un lien pour
          réinitialiser votre mot de passe.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Formulaire de demande de réinitialisation"
          className="mt-8 rounded-2xl bg-white p-6 md:p-8 shadow-sm ring-1 ring-gray-100 space-y-5"
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

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
              Adresse email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                aria-required="true"
                aria-invalid={!!errors.email}
                {...register("email")}
                className="pl-11 pr-4 py-3.5 text-base"
              />
            </div>
            {errors.email && (
              <p role="alert" className="text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-cta w-full justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Envoi en cours…" : "Envoyer le lien"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/connexion" className="text-[#1244E8] font-semibold underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </section>
  );
}
