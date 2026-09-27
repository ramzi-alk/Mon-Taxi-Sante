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
/**
 * Numéro français valide, en acceptant les trois indicatifs rencontrés en
 * base (+33, 0033, ou un simple 0 initial) ainsi que des espaces/points/
 * tirets entre les groupes de chiffres — contrairement à `frenchPhone`
 * (schema.ts du formulaire de réservation), qui n'autorise qu'un format
 * compact et sert à normaliser la saisie à la création. Utilisé par le
 * formulaire "Retrouver une réservation avec sa référence", où on veut
 * plutôt laisser le patient retaper son numéro comme il l'a en tête —
 * normalize_phone_fr (migration 076) fait ensuite matcher côté serveur
 * quel que soit le format stocké.
 */
export const FRENCH_PHONE_LOOKUP_PATTERN = /^(?:\+33|0033|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}$/;

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
