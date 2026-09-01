// Convertit une image quelconque (PNG/JPG/WebP...) en WebP compressé,
// entièrement côté navigateur (Canvas), avant l'upload vers Storage —
// pas de dépendance serveur (sharp, etc.) à ajouter pour ça.
//
// Safari (notamment iOS) n'encode pas réellement en WebP via
// canvas.toBlob : il produit silencieusement un autre format (le plus
// souvent PNG) tout en gardant le blob utilisable, ce qui fait échouer
// l'upload vers un bucket restreint à image/webp avec une erreur peu
// parlante côté serveur. On détecte ce cas en amont plutôt que de laisser
// échouer l'upload sans explication (repéré via les logs Storage après un
// échec réel depuis un iPhone).
let webpSupportCache: boolean | null = null;

export function isWebpEncodingSupported(): boolean {
  if (webpSupportCache !== null) return webpSupportCache;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupportCache = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupportCache;
}

const UNSUPPORTED_BROWSER_MESSAGE =
  "Ce navigateur ne sait pas encoder d'image au format WebP (fréquent sur Safari iOS/mobile). Réessayez avec Chrome, Firefox ou Edge, de préférence sur ordinateur.";

export async function compressImageToWebp(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<Blob> {
  if (!isWebpEncodingSupported()) {
    throw new Error(UNSUPPORTED_BROWSER_MESSAGE);
  }

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
      (blob) => {
        if (!blob) {
          reject(new Error("Échec de la conversion en WebP"));
          return;
        }
        // Filet de sécurité si le blob a un type différent malgré la
        // détection préalable (comportement observé variable selon les
        // versions de WebKit).
        if (blob.type !== "image/webp") {
          reject(new Error(UNSUPPORTED_BROWSER_MESSAGE));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}
