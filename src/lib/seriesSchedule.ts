import { addDays, format, parseISO } from "date-fns";

// Garde-fou : une série très longue (durée max × 7 jours) génèrerait trop de
// réservations réelles à dispatcher aux chauffeurs. Au-delà, on demande au
// patient de réduire la durée ou le nombre de jours plutôt que de tronquer
// silencieusement son planning.
export const MAX_SERIES_SESSIONS = 60;

/**
 * Jours (yyyy-MM-dd) des séances d'une série, à partir de la date de la
 * première séance (toujours incluse côté UI car son jour de semaine est
 * verrouillé dans la sélection), des jours de la semaine choisis
 * (convention Date.getDay() : 0 = dimanche … 6 = samedi) et de la durée
 * en semaines.
 */
export function computeSeriesDates(
  anchorDate: string,
  daysOfWeek: number[],
  durationWeeks: number
): string[] {
  if (!anchorDate || daysOfWeek.length === 0 || durationWeeks < 1) return [];

  const start = parseISO(anchorDate);
  const daysSet = new Set(daysOfWeek);
  const totalDays = durationWeeks * 7;
  const dates: string[] = [];

  for (let i = 0; i < totalDays; i++) {
    const day = addDays(start, i);
    if (daysSet.has(day.getDay())) {
      dates.push(format(day, "yyyy-MM-dd"));
    }
  }

  return dates;
}

export interface SeriesSummary {
  count: number;
  firstDate: string | null;
  lastDate: string | null;
}

export function summarizeSeries(dates: string[]): SeriesSummary {
  return {
    count: dates.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}
