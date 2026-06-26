import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";

export async function uploadFile(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { error } = await client.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) {
    logger.warn("storage.uploadFile failed, continuing without file", {
      error: error.message,
      bucket,
      path,
    });
    return null;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
