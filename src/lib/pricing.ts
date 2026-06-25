// French CPAM taxi conventionné pricing (métropole, 2024 tariff scale)
// Source: Convention nationale organisant les rapports entre les taxis et l'assurance maladie

export interface PricingInput {
  distanceKm: number;
  vehicleType: "taxi" | "vsl" | "pmr";
  hasReturn: boolean;
  requiresWheelchair?: boolean;
  cpamStatus: "ald" | "cmu" | "css" | "standard" | "none";
}

export interface PricingResult {
  basePrice: number;
  distanceCharge: number;
  pmrSupplement: number;
  returnDiscount: number;
  total: number;
  cpamCoverage: number;
  patientShare: number;
}

// CPAM reimbursement rate by coverage status
// ALD / CMU-C / CSS: intégralement pris en charge — standard: 65% — none: à la charge du patient
const CPAM_RATES: Record<PricingInput["cpamStatus"], number> = {
  ald: 1,
  cmu: 1,
  css: 1,
  standard: 0.65,
  none: 0,
};

// Tariff A (urban, day) — approximate 2024 values
const TARIFFS = {
  taxi: {
    baseFare: 2.6,
    perKm: 1.21,
    pmrSupplement: 3.0,
    minFare: 7.3,
  },
  vsl: {
    baseFare: 0,
    perKm: 0.95,
    pmrSupplement: 0,
    minFare: 10.0,
  },
  pmr: {
    baseFare: 2.6,
    perKm: 1.21,
    pmrSupplement: 5.0,
    minFare: 10.0,
  },
};

export function calculateCpamPrice(input: PricingInput): PricingResult {
  const tariff = TARIFFS[input.vehicleType];
  const basePrice = tariff.baseFare;
  const distanceCharge = input.distanceKm * tariff.perKm;
  const pmrSupplement = input.requiresWheelchair ? tariff.pmrSupplement : 0;

  let subtotal = basePrice + distanceCharge + pmrSupplement;
  subtotal = Math.max(subtotal, tariff.minFare);

  const cpamRate = CPAM_RATES[input.cpamStatus];
  const returnDiscount = input.hasReturn ? subtotal * 0.1 : 0;
  const total = Math.max(subtotal - returnDiscount, tariff.minFare);
  const cpamCoverage = total * cpamRate;
  const patientShare = total - cpamCoverage;

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    pmrSupplement: Math.round(pmrSupplement * 100) / 100,
    returnDiscount: Math.round(returnDiscount * 100) / 100,
    total: Math.round(total * 100) / 100,
    cpamCoverage: Math.round(cpamCoverage * 100) / 100,
    patientShare: Math.round(patientShare * 100) / 100,
  };
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
