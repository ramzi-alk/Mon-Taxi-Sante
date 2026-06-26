import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import * as authRepository from "~/repositories/authRepository";
import { Input } from "~/components/ui/input";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — Mon Taxi Santé" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReinitialiserMotDePassePage,
});

const resetSchema = z
  .object({
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type ResetSchema = z.infer<typeof resetSchema>;

async function updatePassword(data: ResetSchema) {
  const { error } = await authRepository.updatePassword(supabase, data.password);
  if (error) {
    logger.warn("auth.updatePassword failed", { error: error.message });
    throw new Error("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.");
  }
}

function ReinitialiserMotDePassePage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    authRepository.getCurrentSession(supabase).then((session) => {
      setHasSession(!!session);
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetSchema>({
    resolver: zodResolver(resetSchema),
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: updatePassword,
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(data: ResetSchema) {
    setErrorMessage(null);
    mutate(data);
  }

  if (isSuccess) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-20 md:py-28 max-w-md text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-black tracking-tight text-[#0B0F1C]">
            Mot de passe mis à jour
          </h1>
          <p className="mt-4 text-gray-500 leading-relaxed">
            Votre mot de passe a bien été modifié. Vous pouvez maintenant vous
            connecter avec vos nouveaux identifiants.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/connexion" })}
            className="btn-cta mt-8 inline-flex bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
          >
            Se connecter
          </button>
        </div>
      </section>
    );
  }

  if (hasSession === false) {
    return (
      <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
        <div className="container py-20 md:py-28 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-black tracking-tight text-[#0B0F1C]">
            Lien invalide ou expiré
          </h1>
          <p className="mt-4 text-gray-500 leading-relaxed">
            Ce lien de réinitialisation n'est plus valide. Demandez-en un
            nouveau pour réinitialiser votre mot de passe.
          </p>
          <Link
            to="/mot-de-passe-oublie"
            className="btn-cta mt-8 inline-flex bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
          >
            Nouvelle demande
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
          Nouveau mot de passe
        </h1>
        <p className="mt-3 text-gray-500 text-center leading-relaxed">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Formulaire de réinitialisation du mot de passe"
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
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={!!errors.password}
                {...register("password")}
                className="pl-11 pr-4 py-3.5 text-base"
              />
            </div>
            {errors.password && (
              <p role="alert" className="text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
                className="pl-11 pr-4 py-3.5 text-base"
              />
            </div>
            {errors.confirmPassword && (
              <p role="alert" className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || hasSession === null}
            className="btn-cta w-full justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </div>
    </section>
  );
}
