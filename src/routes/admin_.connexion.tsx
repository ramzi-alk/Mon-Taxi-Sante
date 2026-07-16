import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Mail, Lock, AlertCircle } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import { adminLoginServerFn } from "~/server/adminAuth";
import { Input } from "~/components/ui/input";
import { useTurnstile, TURNSTILE_SITE_KEY } from "~/hooks/useTurnstile";

export const Route = createFileRoute("/admin_/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion administrateur — Docteur Taxi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminConnexionPage,
});

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginSchema = z.infer<typeof loginSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  too_many_attempts: "Trop de tentatives pour cet email. Réessayez dans 15 minutes.",
  captcha_invalid: "Vérification anti-robot invalide, réessayez.",
  invalid_credentials: "Email ou mot de passe incorrect.",
  not_admin: "Email ou mot de passe incorrect.",
};

function AdminConnexionPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { containerRef, token, reset } = useTurnstile(TURNSTILE_SITE_KEY);
  const [captchaRequired, setCaptchaRequired] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: LoginSchema) =>
      adminLoginServerFn({ data: { ...data, turnstileToken: token } }),
    onSuccess: async ({ access_token, refresh_token }) => {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        logger.error("adminConnexion.setSession failed", { error: error.message });
        setErrorMessage("Connexion réussie mais impossible d'ouvrir la session. Réessayez.");
        return;
      }
      navigate({ to: "/admin" });
    },
    onError: (error: Error) => {
      setErrorMessage(ERROR_MESSAGES[error.message] ?? "Une erreur est survenue. Réessayez.");
      reset();
    },
  });

  function onSubmit(data: LoginSchema) {
    setErrorMessage(null);
    if (!token) {
      setCaptchaRequired(true);
      return;
    }
    setCaptchaRequired(false);
    mutate(data);
  }

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-16 md:py-24 max-w-md">
        <div className="flex justify-center">
          <ShieldCheck className="h-10 w-10 text-[#1244E8]" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase text-center">
          Espace administration
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-[#0B0F1C] text-center">
          Connexion
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Formulaire de connexion administrateur"
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

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
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

          {TURNSTILE_SITE_KEY && <div ref={containerRef} />}
          {captchaRequired && (
            <p role="alert" className="text-sm text-red-600">
              Veuillez valider la vérification anti-robot avant de continuer.
            </p>
          )}

          <div className="text-right">
            <Link
              to="/mot-de-passe-oublie"
              className="text-sm text-[#1244E8] font-semibold underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-cta w-full justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>
      </div>
    </section>
  );
}
