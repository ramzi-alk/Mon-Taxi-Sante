import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — Mon Taxi Santé" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnexionPage,
});

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginSchema = z.infer<typeof loginSchema>;

async function login(data: LoginSchema) {
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (error) throw new Error("Email ou mot de passe incorrect.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .single();

  return profile?.role ?? "patient";
}

function ConnexionPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: login,
    onSuccess: (role) => {
      if (role === "admin") navigate({ to: "/admin" });
      else if (role === "driver") navigate({ to: "/tableau-de-bord/chauffeur" });
      else navigate({ to: "/" });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(data: LoginSchema) {
    setErrorMessage(null);
    mutate(data);
  }

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-16 md:py-24 max-w-md">
        <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4 text-center">
          Espace chauffeur
        </p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B0F1C] text-center">
          Connexion
        </h1>
        <p className="mt-3 text-gray-500 text-center leading-relaxed">
          Accédez à votre tableau de bord chauffeur ou administrateur.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Formulaire de connexion"
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
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                aria-required="true"
                aria-invalid={!!errors.email}
                {...register("email")}
                className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
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
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-required="true"
                aria-invalid={!!errors.password}
                {...register("password")}
                className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
              />
            </div>
            {errors.password && (
              <p role="alert" className="text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-cta w-full justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore inscrit en tant que chauffeur ?{" "}
          <Link to="/chauffeurs/inscription" className="text-[#1244E8] font-semibold underline">
            Rejoindre le réseau
          </Link>
        </p>
      </div>
    </section>
  );
}
