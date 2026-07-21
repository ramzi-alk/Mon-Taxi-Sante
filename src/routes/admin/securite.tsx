import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Smartphone, Trash2, KeyRound } from "lucide-react";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "~/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/securite")({
  head: () => ({
    meta: [{ title: "Sécurité — Administration — Docteur Taxi" }],
  }),
  component: AdminSecuritePage,
});

async function fetchFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp;
}

function EnrollForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"idle" | "verify">("idle");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: startEnroll, isPending: isStarting } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Docteur Taxi Admin",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("verify");
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      logger.error("admin.mfa.enroll failed", { error: error.message });
      setErrorMessage("Impossible de démarrer l'enrôlement. Réessayez.");
    },
  });

  const { mutate: verifyEnroll, isPending: isVerifying } = useMutation({
    mutationFn: async () => {
      if (!factorId) throw new Error("no_factor");
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mfa-factors"] });
      onDone();
    },
    onError: (error: Error) => {
      logger.warn("admin.mfa.verify failed", { error: error.message });
      setErrorMessage("Code invalide. Vérifiez votre application d'authentification et réessayez.");
    },
  });

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => startEnroll()}
        disabled={isStarting}
        className="btn-cta bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {isStarting ? "Génération…" : "Activer la double authentification"}
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-gray-50 p-5 ring-1 ring-gray-100">
      <p className="text-sm font-semibold text-gray-700">
        1. Scannez ce QR code avec une application d'authentification (Google
        Authenticator, 1Password, Authy…)
      </p>
      {qrCode && (
        <img
          src={`data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`}
          alt="QR code TOTP"
          className="mt-3 h-40 w-40 rounded-lg bg-white p-2 ring-1 ring-gray-200"
        />
      )}
      {secret && (
        <p className="mt-2 text-xs text-gray-400">
          Impossible de scanner ? Saisissez cette clé manuellement :{" "}
          <code className="font-mono text-gray-600">{secret}</code>
        </p>
      )}

      <p className="mt-5 text-sm font-semibold text-gray-700">
        2. Entrez le code à 6 chiffres généré par l'application
      </p>
      <div className="mt-2 flex items-center gap-2 max-w-xs">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
        />
        <button
          type="button"
          onClick={() => verifyEnroll()}
          disabled={isVerifying || code.length !== 6}
          className="shrink-0 rounded-xl bg-[#0B0F1C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1244E8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? "Vérification…" : "Valider"}
        </button>
      </div>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function AdminSecuritePage() {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState<string | null>(null);

  const { data: factors, isLoading } = useQuery({
    queryKey: ["admin-mfa-factors"],
    queryFn: fetchFactors,
  });

  const { mutate: unenroll, isPending: isUnenrolling } = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mfa-factors"] });
      setUnenrollTarget(null);
    },
    onError: (error: Error) => {
      logger.error("admin.mfa.unenroll failed", { error: error.message });
    },
  });

  const verifiedFactors = factors?.filter((f) => f.status === "verified") ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h1 className="text-xl font-bold text-[#0B0F1C]">Sécurité du compte</h1>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-2xl">
        Ajoutez une double authentification (TOTP) à votre compte administrateur.
        Elle est disponible dès maintenant mais n'est pas encore exigée pour se
        connecter — l'activation obligatoire fera l'objet d'une confirmation
        séparée une fois validée en conditions réelles.
      </p>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-sm font-bold text-[#0B0F1C] mb-4">Application d'authentification</h2>

        {isLoading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : verifiedFactors.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {verifiedFactors.map((factor) => (
              <li
                key={factor.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-100"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm font-semibold text-gray-700">
                    {factor.friendly_name ?? "Application TOTP"}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnenrollTarget(factor.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Désactiver
                </button>
              </li>
            ))}
          </ul>
        ) : enrolling ? (
          <EnrollForm onDone={() => setEnrolling(false)} />
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Aucune double authentification active sur ce compte.
            </p>
            <button
              type="button"
              onClick={() => setEnrolling(true)}
              className="btn-cta bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Activer la double authentification
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={unenrollTarget !== null} onOpenChange={(open) => !open && setUnenrollTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver la double authentification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre compte ne sera plus protégé par un second facteur. Vous pourrez
              en réactiver un à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUnenrolling}
              onClick={() => unenrollTarget && unenroll(unenrollTarget)}
            >
              {isUnenrolling ? "Désactivation…" : "Désactiver"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
