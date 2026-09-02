import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, ShieldCheck, LogOut, AlertCircle, History } from "lucide-react";
import { getPatientEmailAuthClient } from "~/lib/supabaseIsolated";
import * as authRepository from "~/repositories/authRepository";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import { BookingStatusCard } from "./BookingStatusCard";
import { Input } from "~/components/ui/input";
import { logger } from "~/lib/logger";
import { logClientErrorServerFn } from "~/server/errorReporting";

type Stage = "checking" | "signed_out" | "code_sent" | "signed_in";

// signInWithOtp/verifyOtp below call Supabase Auth directly from the
// browser (see supabaseIsolated.ts) — they never go through our own
// TanStack Start server, so none of it shows up in Vercel Runtime Logs no
// matter how the server side is instrumented. logger.warn alone only
// reaches the browser console (pino's browser build doesn't write to
// stdout). Relay the real Supabase error message through the same
// server-side logger the root error boundary uses, so a failure here is
// actually visible.
function reportAuthError(message: string, error: Error): void {
  logger.warn(message, { error: error.message });
  logClientErrorServerFn({
    data: {
      message: `${message}: ${error.message}`,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    },
  }).catch(() => {
    // Best-effort — don't let logging failures compound the original error.
  });
}

/**
 * Deuxième voie de suivi patient, indépendante de l'appareil : le suivi
 * "par défaut" (mes-reservations.tsx) est lié à la session anonyme locale,
 * donc perdu si le patient change d'appareil ou vide son cache. Ici, une
 * fois l'email vérifié par code à usage unique, l'historique complet est
 * retrouvé par correspondance sur cet email (voir migration 069) — quel que
 * soit l'appareil qui a servi à réserver. Volontairement en lecture seule :
 * annuler/modifier reste réservé à la session locale ou à la recherche par
 * référence + téléphone (BookingLookupForm), qui restent les deux seules
 * voies dont le back-end vérifie la propriété pour ces actions.
 */
export function PatientEmailLogin() {
  const client = getPatientEmailAuthClient();
  const [stage, setStage] = useState<Stage>("checking");
  const [emailInput, setEmailInput] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setStage(data.session ? "signed_in" : "signed_out");
    });
  }, [client]);

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings-by-email"],
    queryFn: () => bookingsRepository.fetchMyBookingsByEmail(client),
    enabled: stage === "signed_in",
  });

  const requestCodeMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await authRepository.requestPatientEmailCode(client, email);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, email) => {
      setConfirmedEmail(email);
      setStage("code_sent");
      setErrorMessage(null);
    },
    onError: (err: Error) => {
      reportAuthError("auth.requestPatientEmailCode failed", err);
      setErrorMessage("Impossible d'envoyer le code pour le moment. Réessayez plus tard.");
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authRepository.verifyPatientEmailCode(client, confirmedEmail, token);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setErrorMessage(null);
      setStage("signed_in");
    },
    onError: (err: Error) => {
      reportAuthError("auth.verifyPatientEmailCode failed", err);
      setErrorMessage("Code invalide ou expiré. Vérifiez le code reçu par email et réessayez.");
    },
  });

  async function handleSignOut() {
    await client.auth.signOut();
    setStage("signed_out");
    setEmailInput("");
    setConfirmedEmail("");
    setCode("");
  }

  if (stage === "checking") return null;

  return (
    <section
      aria-labelledby="email-login-heading"
      className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6"
    >
      <h2
        id="email-login-heading"
        className="flex items-center gap-2 text-base font-bold text-gray-900"
      >
        <History className="h-5 w-5 text-brand-blue-600 shrink-0" aria-hidden="true" />
        Retrouver tout mon historique par email
      </h2>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
        Connectez-vous avec l&apos;adresse email utilisée lors de vos réservations
        pour afficher votre historique complet, quel que soit l&apos;appareil
        utilisé pour réserver. Vous restez connecté sur cet appareil pour vos
        prochaines visites.
      </p>

      {stage === "signed_out" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailInput) requestCodeMutation.mutate(emailInput);
          }}
          className="mt-4 flex flex-col sm:flex-row gap-2"
          aria-label="Recevoir un code de connexion par email"
        >
          <Input
            type="email"
            required
            placeholder="vous@exemple.fr"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="flex-1"
            aria-label="Adresse email"
          />
          <button
            type="submit"
            disabled={requestCodeMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {requestCodeMutation.isPending ? "Envoi…" : "Recevoir un code"}
          </button>
        </form>
      )}

      {stage === "code_sent" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code) verifyCodeMutation.mutate(code);
          }}
          className="mt-4 space-y-2"
          aria-label="Valider le code reçu par email"
        >
          <p className="text-sm text-gray-600">
            Code envoyé à <strong>{confirmedEmail}</strong>. Vérifiez vos spams si besoin.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1"
              aria-label="Code reçu par email"
            />
            <button
              type="submit"
              disabled={verifyCodeMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {verifyCodeMutation.isPending ? "Vérification…" : "Valider"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setStage("signed_out");
              setErrorMessage(null);
            }}
            className="text-xs font-medium text-gray-500 hover:underline"
          >
            Utiliser une autre adresse
          </button>
        </form>
      )}

      {errorMessage && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}

      {stage === "signed_in" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-green-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Connecté{confirmedEmail ? ` — ${confirmedEmail}` : ""}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:underline"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>

          {bookingsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Chargement de votre historique…</p>
          )}
          {bookingsQuery.isError && (
            <p role="alert" className="text-sm text-red-600">
              Impossible de charger votre historique pour le moment.
            </p>
          )}
          {bookingsQuery.data && bookingsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune réservation trouvée pour cette adresse email.
            </p>
          )}
          {bookingsQuery.data && bookingsQuery.data.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Pour annuler ou modifier une réservation active, utilisez le
                suivi ci-dessus depuis cet appareil, ou la recherche par
                référence plus bas.
              </p>
              <div className="space-y-4">
                {bookingsQuery.data.map((booking) => (
                  <BookingStatusCard key={booking.id} booking={booking} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
