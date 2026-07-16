import { Resend } from "resend";

// Server-only — never import this from client components. RESEND_API_KEY
// is a secret key and must not be exposed via import.meta.env (which Vite
// inlines into the client bundle for VITE_-prefixed vars only, but we keep
// the convention explicit here regardless).
let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    client = new Resend(apiKey);
  }
  return client;
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || "Docteur Taxi <reservations@mon-taxi-sante.com>";

export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || "contact@mon-taxi-sante.com";
