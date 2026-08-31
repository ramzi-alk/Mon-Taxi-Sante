// Vérifie que la formule tarifaire CPAM taxi de src/lib/pricing.ts
// (calculatePrice, utilisée pour l'estimation affichée avant confirmation —
// voir Step10Confirmation.tsx) reste synchronisée avec son implémentation
// SQL (public.compute_booking_price, trigger bookings_set_distance_and_price,
// migrations 026/027), qui calcule la valeur qui fait foi : estimated_price.
//
// Les deux existent séparément parce que le client a besoin d'une
// estimation AVANT qu'une ligne bookings n'existe (donc avant que le
// trigger ne puisse s'exécuter) — ce n'est pas un doublon accidentel, mais
// ça reste une vraie dette : toute évolution de la convention tarifaire
// 2025 doit être répercutée dans les DEUX fichiers, à la main, dans deux
// langages différents. Ce script est le filet de sécurité : à relancer
// après toute modification de l'un ou l'autre.
//
// Usage : node scripts/verify-pricing-parity.mjs
// Nécessite un accès réseau réel + VITE_SUPABASE_URL et
// VITE_SUPABASE_ANON_KEY dans l'environnement (voir .env.local) — comme les
// scripts scripts/seo-data/, pas exécutable dans un environnement à accès
// réseau restreint.

// Fixé en UTC avant toute manipulation de Date : compute_booking_price
// tourne dans une session Postgres en timezone UTC (vérifié via
// `SHOW timezone`), alors que calculatePrice() utilise Date.getHours()/
// getDay() en heure LOCALE de la machine qui exécute ce script. Sans ce
// verrou, la majoration horaire (nuit/samedi/dimanche/férié) pourrait
// diverger entre les deux implémentations selon le fuseau horaire du poste
// qui lance le script — un faux désaccord qui n'aurait rien à voir avec un
// vrai écart de formule.
process.env.TZ = "UTC";

import { createClient } from "@supabase/supabase-js";
import { calculatePrice, departementDepuisAdresse } from "../src/lib/pricing.ts";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis (voir .env.local)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Un cas par branche de la formule (convention 2025) : forfait de base
// seul, majoration horaire nuit/dimanche, retour à vide (hospitalisation),
// supplément TPMR, et un trajet sous les 4 km inclus dans le forfait.
const cases = [
  {
    label: "Paris, 10 km, jour de semaine",
    pickupAddress: "15 Rue de la Paix, 75001 Paris",
    dropoffAddress: "Hôpital Lariboisière, 75010 Paris",
    distanceKm: 10,
    pickupDatetime: "2026-06-15T10:00:00Z", // lundi
    vehicleType: "taxi",
    isHospitalization: false,
    requiresWheelchair: false,
  },
  {
    label: "Marseille, 30 km, nuit",
    pickupAddress: "10 Rue de la République, 13001 Marseille",
    dropoffAddress: "5 Avenue du Prado, 13006 Marseille",
    distanceKm: 30,
    pickupDatetime: "2026-06-15T22:00:00Z",
    vehicleType: "taxi",
    isHospitalization: false,
    requiresWheelchair: false,
  },
  {
    label: "Nantes, 60 km, dimanche, retour à vide (hospitalisation)",
    pickupAddress: "5 Place Royale, 44000 Nantes",
    dropoffAddress: "1 Rue Eric Tabarly, 44000 Nantes",
    distanceKm: 60,
    pickupDatetime: "2026-06-14T09:00:00Z", // dimanche
    vehicleType: "vsl",
    isHospitalization: true,
    requiresWheelchair: false,
  },
  {
    label: "Paris, 5 km, TPMR",
    pickupAddress: "15 Rue de la Paix, 75001 Paris",
    dropoffAddress: "Hôpital Cochin, 75014 Paris",
    distanceKm: 5,
    pickupDatetime: "2026-06-16T14:00:00Z",
    vehicleType: "pmr",
    isHospitalization: false,
    requiresWheelchair: true,
  },
  {
    label: "Marseille, 2 km (sous les 4 km inclus), samedi après-midi",
    pickupAddress: "10 Rue de la République, 13001 Marseille",
    dropoffAddress: "20 Rue de la République, 13001 Marseille",
    distanceKm: 2,
    pickupDatetime: "2026-06-13T15:00:00Z", // samedi après 12h → majoration
    vehicleType: "taxi",
    isHospitalization: false,
    requiresWheelchair: false,
  },
];

let failures = 0;

for (const c of cases) {
  const codeDepartement = departementDepuisAdresse(c.pickupAddress);

  const jsResult = calculatePrice({
    distanceKm: c.distanceKm,
    codeDepartement,
    adresseDepart: c.pickupAddress,
    adresseArrivee: c.dropoffAddress,
    pickupDatetime: c.pickupDatetime,
    cpamStatus: "none", // n'affecte pas `total`, seulement sa répartition CPAM/patient
    retourAVide: c.isHospitalization,
    tpmr: c.requiresWheelchair,
  });

  const { data: sqlTotal, error } = await supabase.rpc("compute_booking_price", {
    p_distance_km: c.distanceKm,
    p_vehicle_type: c.vehicleType,
    p_trip_type: "aller_simple",
    p_requires_wheelchair: c.requiresWheelchair,
    p_pickup_datetime: c.pickupDatetime,
    p_is_hospitalization: c.isHospitalization,
    p_pickup_address: c.pickupAddress,
    p_dropoff_address: c.dropoffAddress,
  });

  if (error) {
    console.error(`❌ ${c.label} : erreur RPC — ${error.message}`);
    failures++;
    continue;
  }

  const match = Math.abs(jsResult.total - sqlTotal) < 0.01;
  console.log(
    `${match ? "✅" : "❌"} ${c.label} : JS=${jsResult.total} € SQL=${sqlTotal} €`
  );
  if (!match) failures++;
}

if (failures > 0) {
  console.error(
    `\n${failures} désaccord(s) entre src/lib/pricing.ts et public.compute_booking_price.\n` +
      "Vérifiez que toute évolution récente de la convention tarifaire a bien été répercutée dans les deux implémentations (voir supabase/migrations/026_tarif_cpam_2025_formula.sql)."
  );
  process.exit(1);
}

console.log("\nLes deux implémentations du moteur de prix sont synchronisées.");
