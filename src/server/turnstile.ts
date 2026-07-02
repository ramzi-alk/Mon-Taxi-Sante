import { logger } from "~/lib/logger";

/** Server-side verification of a Cloudflare Turnstile token — see src/hooks/useTurnstile.ts for the client widget. */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.error("turnstile.verify skipped: missing TURNSTILE_SECRET_KEY");
    return false;
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const result = (await response.json()) as { success: boolean };
  return result.success;
}
