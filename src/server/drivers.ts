import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import * as driversRepository from "~/repositories/driversRepository";
import { logger } from "~/lib/logger";
import { notifyAdminNewDriverApplicationServerFn } from "./email";

const siretRegex = /^\d{14}$/;

const submitDriverApplicationSchema = z.object({
  profile_id: z.string().uuid(),
  siret: z.string().regex(siretRegex),
  company_name: z.string().nullable(),
  vehicle_type: z.enum(["taxi", "vsl", "ambulance"]),
  vehicle_registration: z.string().min(1),
  pmr_equipped: z.boolean(),
});

// Runs server-side with the service role client so the insert never depends
// on the caller's client-side auth session — right after signUp() the
// browser may not have one yet (e.g. when email confirmation is required).
export const submitDriverApplicationServerFn = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof submitDriverApplicationSchema>) =>
    submitDriverApplicationSchema.parse(input)
  )
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", data.profile_id)
      .single();

    if (profileError || !profile || profile.role !== "driver") {
      logger.error("drivers.submitDriverApplication invalid profile", {
        profileId: data.profile_id,
        error: profileError?.message,
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
