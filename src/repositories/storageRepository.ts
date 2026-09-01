import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";

export async function uploadFile(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string }
): Promise<string | null> {
  const { error } = await client.storage.from(bucket).upload(path, file, {
    upsert: options?.upsert ?? false,
    contentType: options?.contentType,
  });
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

/**
 * Dépose un fichier dans un bucket privé et retourne son *chemin* — jamais
 * une URL publique (getPublicUrl ne fonctionnerait de toute façon pas sur un
 * bucket privé). Pour un document sensible (santé, identité) : générer une
 * URL d'accès à la demande via createSignedUrl plutôt que de stocker un lien
 * durablement valide.
 */
export async function uploadPrivateFile(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { error } = await client.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) {
    logger.warn("storage.uploadPrivateFile failed, continuing without file", {
      error: error.message,
      bucket,
      path,
    });
    return null;
  }
  return path;
}

/**
 * Lien signé à durée de vie limitée pour consulter/télécharger un fichier
 * d'un bucket privé (voir uploadPrivateFile) — jamais d'URL publique stockée.
 */
export async function createSignedUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    logger.error("storage.createSignedUrl failed", { error: error?.message, bucket, path });
    throw new Error(error?.message ?? "Lien de fichier indisponible");
  }
  return data.signedUrl;
}
