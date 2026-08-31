import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";
import * as driversRepository from "~/repositories/driversRepository";
import type { DriverStatsPeriod } from "~/repositories/driversRepository";

export type StatsPeriod = "today" | "week" | "month" | "total";

async function fetchMyDriverStats(): Promise<driversRepository.MyDriverStats | null> {
  return driversRepository.fetchMyDriverStats(supabase);
}

async function fetchMyDriverPerformance(): Promise<driversRepository.MyDriverPerformance | null> {
  return driversRepository.fetchMyDriverPerformance(supabase);
}

async function fetchDriverStatsSince(since: Date): Promise<DriverStatsPeriod> {
  return driversRepository.fetchDriverStatsSince(supabase, since);
}

/**
 * Statistiques du chauffeur (courses, gains, km) sur la période choisie, et
 * ses indicateurs de performance (taux d'acceptation/annulation, note
 * récente) — sélecteur de période "Auj. / 7 j / 30 j / Total" inclus.
 */
export function useDriverStats() {
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("today");

  const statsQuery = useQuery({
    queryKey: ["my-driver-stats"],
    queryFn: fetchMyDriverStats,
  });

  const performanceQuery = useQuery({
    queryKey: ["my-driver-performance"],
    queryFn: fetchMyDriverPerformance,
  });

  const periodSince = (() => {
    const d = new Date();
    if (statsPeriod === "today") {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (statsPeriod === "week") {
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (statsPeriod === "month") {
      d.setDate(d.getDate() - 30);
      return d;
    }
    return d;
  })();

  const periodStatsQuery = useQuery({
    queryKey: ["driver-stats-since", statsPeriod],
    queryFn: () => fetchDriverStatsSince(periodSince),
    enabled: statsPeriod !== "total",
  });

  const s = statsQuery.data;
  const p = periodStatsQuery.data;
  const periodSummary = {
    rides:
      statsPeriod === "today" ? (s?.rides_today ?? 0) : statsPeriod === "total" ? (s?.rides_completed ?? 0) : (p?.rides ?? 0),
    earnings:
      statsPeriod === "today"
        ? (s?.earnings_today ?? 0)
        : statsPeriod === "total"
          ? (s?.total_earnings ?? 0)
          : (p?.earnings ?? 0),
    km: statsPeriod === "total" ? (s?.total_km ?? 0) : (p?.km ?? 0),
  };

  return {
    statsQuery,
    performanceQuery,
    statsPeriod,
    setStatsPeriod,
    periodSummary,
  };
}
