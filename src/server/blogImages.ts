import { createServerFn } from "@tanstack/react-start";
import sharp from "sharp";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { checkAdminAccessServerFn } from "./adminAccess";
import { withServerFnLogging } from "~/lib/logger";

const BUCKET = "blog-images";
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;

interface UploadBlogImageInput {
  accessToken: string;
  slug: string;
  /** PNG encodé en base64 (sans le préfixe data:...;base64,), déjà
   * redimensionné côté client — voir src/lib/imageResize.ts. Le format
   * d'entrée est fixé à PNG pour rester universellement supporté par
   * canvas.toBlob (contrairement à image/webp, mal géré par Safari/WebKit) ;
   * seule la conversion finale en WebP, faite ici avec sharp, doit être
   * fiable indépendamment du navigateur de l'admin.
   */
  imagePngBase64: string;
}

interface UploadBlogImageResult {
  url: string;
  originalKb: number;
  compressedKb: number;
}

async function uploadBlogImage(input: UploadBlogImageInput): Promise<UploadBlogImageResult> {
  const hasAdminAccess = await checkAdminAccessServerFn({ data: { accessToken: input.accessToken } });
  if (!hasAdminAccess) {
    throw new Error("not_admin");
  }

  const pngBuffer = Buffer.from(input.imagePngBase64, "base64");

  const webpBuffer = await sharp(pngBuffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const admin = getSupabaseAdminClient();
  const path = `${input.slug}.webp`;
  const { error } = await admin.storage.from(BUCKET).upload(path, webpBuffer, {
    upsert: true,
    contentType: "image/webp",
  });
  if (error) {
    throw new Error(error.message);
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    originalKb: Math.round(pngBuffer.byteLength / 1024),
    compressedKb: Math.round(webpBuffer.byteLength / 1024),
  };
}

export const uploadBlogImageServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: UploadBlogImageInput) => input)
  .handler(async ({ data }) =>
    withServerFnLogging("uploadBlogImage", { slug: data.slug }, () => uploadBlogImage(data))
  );
