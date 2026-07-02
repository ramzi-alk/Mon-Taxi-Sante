// Server-only allowlist, independent of the `profiles.role` column — a
// second gate for the admin panel that a compromised or mis-migrated DB row
// alone cannot satisfy. See src/server/adminAccess.ts for how it's combined
// with the DB role check.

function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Empty allowlist (ADMIN_EMAILS not configured) intentionally does not lock
 * everyone out — it keeps pre-Sprint-1 behavior (DB role is the only gate)
 * until an operator opts in by setting the env var in production.
 */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  const allowlist = parseAllowlist(process.env.ADMIN_EMAILS);
  if (allowlist.length === 0) return true;
  if (!email) return false;
  return allowlist.includes(email.toLowerCase());
}
