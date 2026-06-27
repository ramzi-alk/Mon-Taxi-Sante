import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import * as driversRepository from "~/repositories/driversRepository";
import { logger } from "~/lib/logger";
import { notifyAdminNewDriverApplicationServerFn } from "./email";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

const siretRegex = /^\d{14}$/;

const submitDriverApplicationSchema = z.object({
  profile_id: z.string().uuid(),
  siret: z.string().regex(siretRegex),
  company_name: z.string().nullable(),
  vehicle_type: z.enum(["taxi", "vsl", "ambulance"]),
  vehicle_registration: z.string().min(1),
  pmr_equipped: z.boolean(),
});

// The DB trigger that creates a profiles row from auth.users normally
// covers this, but signups have occasionally landed without one (no logged
// trigger failure — root cause unconfirmed). Self-heal here instead of
// trusting the trigger as the only path: read the source of truth
// (auth.users) and upsert the profile before continuing.
async function ensureProfile(admin: SupabaseAdminClient, profileId: string) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();

  if (existing) return existing;

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profileId);
  if (authUserError || !authUser.user) {
    logger.error("drivers.ensureProfile auth user not found", {
      profileId,
      error: authUserError?.message,
    });
    return null;
  }

  const metadata = authUser.user.user_metadata ?? {};
  const role = metadata.role === "driver" || metadata.role === "admin" ? metadata.role : "patient";
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.length >= 2
      ? metadata.full_name
      : authUser.user.email?.split("@")[0] ?? "Patient";

  const { data: created, error: insertError } = await admin
    .from("profiles")
    .upsert({ id: profileId, email: authUser.user.email ?? null, full_name: fullName, role })
    .select("id, role")
    .single();

  if (insertError) {
    logger.error("drivers.ensureProfile upsert failed", { profileId, error: insertError.message });
    return null;
  }

  return created;
}

// Runs server-side with the service role client so the insert never depends
// on the caller's client-side auth session — right after signUp() the
// browser may not have one yet (e.g. when email confirmation is required).
export const submitDriverApplicationServerFn = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof submitDriverApplicationSchema>) =>
    submitDriverApplicationSchema.parse(input)
  )
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();

    const profile = await ensureProfile(admin, data.profile_id);

    if (!profile || profile.role !== "driver") {
      logger.error("drivers.submitDriverApplication invalid profile", {
        profileId: data.profile_id,
        role: profile?.role,
      });
      throw new Error("Profil chauffeur introuvable.");
    }

    const driverDetails = await driversRepository.insertDriverDetails(admin, {
      profile_id: data.profile_id,
      siret: data.siret,
      company_name: data.company_name,
      convention_cpam: false,
      convention_number: null,
      vehicle_type: data.vehicle_type,
      vehicle_registration: data.vehicle_registration,
      pmr_equipped: data.pmr_equipped,
      subscription_status: "trial",
      subscription_ends_at: null,
      approved_at: null,
    });

    await notifyAdminNewDriverApplicationServerFn({ data: { driverDetailsId: driverDetails.id } });

    return driverDetails;
  });
