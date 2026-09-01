// Convertit une image quelconque (PNG/JPG/WebP...) en WebP compressé,
// entièrement côté navigateur (Canvas), avant l'upload vers Storage —
// pas de dépendance serveur (sharp, etc.) à ajouter pour ça.
export async function compressImageToWebp(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<Blob> {
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
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec de la conversion en WebP"))),
      "image/webp",
      quality
    );
  });
}
