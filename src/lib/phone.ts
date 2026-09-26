/**
 * Réduit un numéro de téléphone (ou un fragment tapé dans une recherche) à
 * son "numéro national significatif" — les chiffres sans l'indicatif pays,
 * quelle que soit la façon dont celui-ci a été saisi (+33, 0033, ou un 0
 * initial) ni la présence d'espaces/points/tirets.
 *
 * Sert à faire matcher une recherche malgré les formats hétérogènes
 * présents en base (certaines réservations ont patient_phone stocké en
 * "+33612345678", d'autres en "0612345678", etc.) : on compare le "cœur"
 * du numéro plutôt que sa forme brute. Retourne null quand le terme ne
 * ressemble pas à un numéro, pour que l'appelant n'ajoute pas une clause
 * ilike inutile sur une recherche par nom ou référence.
 */
export function phoneSearchDigits(term: string): string | null {
  const trimmed = term.trim();
  if (!trimmed || !/^[0-9+\s.-]+$/.test(trimmed)) return null;

  let digits = trimmed.replace(/[\s.-]/g, "");
  if (!digits) return null;

  if (digits.startsWith("0033")) digits = digits.slice(4);
  else if (digits.startsWith("+33")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  else if (digits.startsWith("+")) digits = digits.slice(1);

  return digits.length >= 2 ? digits : null;
}
