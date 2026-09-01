// Redimensionne une image côté navigateur et l'exporte en PNG — jamais en
// WebP ici : canvas.toBlob("image/webp") n'est pas fiable sur Safari/WebKit,
// qui peut produire silencieusement un autre format. PNG est en revanche
// universellement supporté et sans perte, adapté aux illustrations plates
// (aplats de couleur) de ce site. La conversion finale en WebP compressé se
// fait côté serveur avec sharp (src/server/blogImages.ts), indépendamment du
// navigateur utilisé pour l'envoi.
export async function resizeImageToPng(file: File, maxWidth = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible dans ce navigateur");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec du redimensionnement de l'image"))),
      "image/png"
    );
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Retire le préfixe "data:image/png;base64," pour ne garder que le
      // contenu base64 attendu par uploadBlogImageServerFn.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Échec de la lecture du fichier"));
    reader.readAsDataURL(blob);
  });
}
