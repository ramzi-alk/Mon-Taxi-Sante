// Génère un CSV côté client et déclenche son téléchargement — pas de round-trip
// serveur nécessaire, les données sont déjà chargées côté client.
function escapeCsvCell(value: string | number): string {
  const str = String(value);
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  // Séparateur point-virgule + BOM UTF-8 : Excel FR ouvre correctement les
  // accents et n'interprète pas les virgules décimales comme séparateurs.
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(";"));
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
