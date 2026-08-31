import { describe, expect, it } from "vitest";
import {
  calculatePrice,
  departementDepuisAdresse,
  departementDepuisCodePostal,
  detecterGrandeVille,
  estJourFerie,
  aMajorationHoraire,
  formatPrice,
  type PricingInput,
} from "./pricing";

// Ces tests figent le comportement actuel de calculatePrice() — la formule
// tarifaire CPAM taxi (convention 2025) qui détermine ce qu'un patient et
// l'Assurance Maladie paient réellement. Voir le commentaire en tête de
// pricing.ts : cette formule existe EN DOUBLE (ici et en SQL, migration 026),
// et scripts/verify-pricing-parity.mjs vérifie que les deux restent
// synchronisées. Ces tests ne vérifient PAS cette parité (le script s'en
// charge) — ils protègent contre une régression accidentelle de cette seule
// implémentation TS, qui n'avait jusqu'ici aucun filet automatisé.

// Lundi 15 janvier 2024, 14h — jour ouvré, hors majoration horaire, hors
// jour férié. Date de référence pour tous les cas qui ne testent pas la
// majoration horaire elle-même.
const WEEKDAY_DAYTIME = "2024-01-15T14:00:00";

function baseInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    distanceKm: 10,
    codeDepartement: "1",
    pickupDatetime: WEEKDAY_DAYTIME,
    cpamStatus: "standard",
    ...overrides,
  };
}

describe("calculatePrice", () => {
  it("applique le forfait de base et le tarif au km au-delà des 4 km inclus", () => {
    const result = calculatePrice(baseInput({ distanceKm: 10, codeDepartement: "1" }));
    expect(result.forfaitBase).toBe(13);
    expect(result.details.kmFacturables).toBe(6); // 10 - 4
    expect(result.details.tarifKmDept).toBe(1.13);
    expect(result.montantKm).toBeCloseTo(6 * 1.13, 2);
    expect(result.forfaitGrandeVille).toBe(0);
  });

  it("ne facture aucun km supplémentaire en dessous du seuil de 4 km inclus", () => {
    const result = calculatePrice(baseInput({ distanceKm: 4 }));
    expect(result.details.kmFacturables).toBe(0);
    expect(result.montantKm).toBe(0);
  });

  it("retombe sur le tarif départemental par défaut si le département est inconnu", () => {
    const result = calculatePrice(baseInput({ codeDepartement: "999", distanceKm: 20 }));
    expect(result.details.tarifKmDept).toBe(1.1);
  });

  it("applique le forfait grande ville une seule fois si départ et arrivée sont tous deux en grande ville", () => {
    const result = calculatePrice(
      baseInput({
        adresseDepart: "1 Rue de Rivoli, 75001 Paris",
        adresseArrivee: "10 Avenue Foch, 75016 Paris",
      })
    );
    expect(result.details.grandeVilleDetectee).toBe(true);
    expect(result.forfaitGrandeVille).toBe(15);
  });

  it("n'applique pas le forfait grande ville pour un code postal parisien non reconnu ni un nom de commune connu", () => {
    // 75000 n'est pas un arrondissement réel — absent de la liste, à la
    // différence de 75001-75020 — et l'adresse ne nomme aucune commune connue.
    const result = calculatePrice(baseInput({ adresseDepart: "10 Rue X, 75000" }));
    expect(result.details.grandeVilleDetectee).toBe(false);
  });

  it("applique la majoration horaire de nuit (20h-8h) sur forfaits + km, mais pas sur le TPMR", () => {
    const withoutTpmr = calculatePrice(
      baseInput({ distanceKm: 4, pickupDatetime: "2024-01-15T22:00:00" })
    );
    expect(withoutTpmr.details.majoHoraireAppliquee).toBe(true);
    expect(withoutTpmr.majorationHoraire).toBeCloseTo(13 * 0.5, 2); // forfaitBase seul, 4km inclus

    const withTpmr = calculatePrice(
      baseInput({ distanceKm: 4, pickupDatetime: "2024-01-15T22:00:00", tpmr: true })
    );
    expect(withTpmr.supplementTpmr).toBe(30);
    // La majoration horaire ne doit pas non plus s'appliquer au supplément TPMR.
    expect(withTpmr.majorationHoraire).toBeCloseTo(withoutTpmr.majorationHoraire, 2);
    expect(withTpmr.total).toBeCloseTo(withoutTpmr.total + 30, 2);
  });

  it("n'applique aucune majoration horaire en journée un jour ouvré", () => {
    const result = calculatePrice(baseInput());
    expect(result.details.majoHoraireAppliquee).toBe(false);
    expect(result.majorationHoraire).toBe(0);
  });

  it("applique la majoration horaire toute la journée le dimanche", () => {
    // Dimanche 14 janvier 2024, 10h — pas nuit, pas férié.
    const result = calculatePrice(baseInput({ pickupDatetime: "2024-01-14T10:00:00" }));
    expect(result.details.majoHoraireAppliquee).toBe(true);
  });

  it("applique la majoration horaire le samedi après 12h mais pas avant", () => {
    // Samedi 13 janvier 2024.
    const morning = calculatePrice(baseInput({ pickupDatetime: "2024-01-13T10:00:00" }));
    const afternoon = calculatePrice(baseInput({ pickupDatetime: "2024-01-13T13:00:00" }));
    expect(morning.details.majoHoraireAppliquee).toBe(false);
    expect(afternoon.details.majoHoraireAppliquee).toBe(true);
  });

  it("applique la majoration horaire un jour férié fixe et un jour férié mobile (lundi de Pâques)", () => {
    const noel = calculatePrice(baseInput({ pickupDatetime: "2024-12-25T10:00:00" }));
    const lundiPaques = calculatePrice(baseInput({ pickupDatetime: "2024-04-01T10:00:00" }));
    expect(noel.details.majoHoraireAppliquee).toBe(true);
    expect(lundiPaques.details.majoHoraireAppliquee).toBe(true);
  });

  it("majore le retour à vide de 25% jusqu'à 49 km et de 50% à partir de 50 km", () => {
    const short = calculatePrice(baseInput({ distanceKm: 30, retourAVide: true, codeDepartement: "1" }));
    expect(short.details.majorationRetourVide).toBe(0.25);
    // 30 * 1.13 * 1.25 = 42.375 → arrondi à 42.38 (arrondir() du module).
    expect(short.montantRetourVide).toBeCloseTo(42.38, 1);

    const long = calculatePrice(baseInput({ distanceKm: 60, retourAVide: true, codeDepartement: "1" }));
    expect(long.details.majorationRetourVide).toBe(0.5);
    // 60 * 1.13 * 1.5 = 101.7
    expect(long.montantRetourVide).toBeCloseTo(101.7, 1);
  });

  it("n'applique aucun retour à vide s'il n'est pas demandé", () => {
    const result = calculatePrice(baseInput({ distanceKm: 30, retourAVide: false }));
    expect(result.details.retourVideApplique).toBe(false);
    expect(result.montantRetourVide).toBe(0);
  });

  it("plafonne le péage à 0 s'il est fourni négatif, et le répercute tel quel sinon", () => {
    expect(calculatePrice(baseInput({ peage: -10 })).peage).toBe(0);
    expect(calculatePrice(baseInput({ peage: 5.5 })).peage).toBe(5.5);
  });

  it("applique l'abattement transport partagé selon le nombre de patients", () => {
    const solo = calculatePrice(baseInput({ nbPatients: 1 }));
    const deux = calculatePrice(baseInput({ nbPatients: 2 }));
    const trois = calculatePrice(baseInput({ nbPatients: 3 }));
    const quatre = calculatePrice(baseInput({ nbPatients: 4 }));
    const cinq = calculatePrice(baseInput({ nbPatients: 5 }));

    expect(solo.details.abattementTaux).toBe(0);
    expect(deux.details.abattementTaux).toBe(0.23);
    expect(trois.details.abattementTaux).toBe(0.35);
    expect(quatre.details.abattementTaux).toBe(0.37);
    expect(cinq.details.abattementTaux).toBe(0.37); // 4 patients et plus : même taux plafond

    expect(deux.total).toBeLessThan(solo.total);
    expect(deux.abattementPartage).toBeLessThan(0);
  });

  it("n'applique pas l'abattement transport partagé au TPMR ni au péage", () => {
    const solo = calculatePrice(baseInput({ tpmr: true, peage: 10, nbPatients: 1 }));
    const deux = calculatePrice(baseInput({ tpmr: true, peage: 10, nbPatients: 2 }));
    // Le supplément TPMR et le péage sont identiques dans les deux cas —
    // seule la base (forfaits + km + majoration horaire) est abattue.
    expect(deux.supplementTpmr).toBe(solo.supplementTpmr);
    expect(deux.peage).toBe(solo.peage);
  });

  it("répartit le total selon le statut CPAM du patient", () => {
    for (const status of ["ald", "cmu", "css"] as const) {
      const result = calculatePrice(baseInput({ cpamStatus: status }));
      expect(result.prixCpam).toBeCloseTo(result.total, 2); // 100%
      expect(result.partPatient).toBeCloseTo(0, 2);
    }

    const standard = calculatePrice(baseInput({ cpamStatus: "standard" }));
    expect(standard.prixCpam).toBeCloseTo(standard.total * 0.65, 2);
    expect(standard.partPatient).toBeCloseTo(standard.total * 0.35, 2);

    const none = calculatePrice(baseInput({ cpamStatus: "none" }));
    expect(none.prixCpam).toBe(0);
    expect(none.partPatient).toBeCloseTo(none.total, 2);
  });

  it("arrondit tous les montants du résultat à 2 décimales", () => {
    const result = calculatePrice(baseInput({ distanceKm: 17, codeDepartement: "18", nbPatients: 3 }));
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "number") {
        expect(value, key).toBeCloseTo(Math.round(value * 100) / 100, 10);
      }
    }
  });
});

describe("detecterGrandeVille", () => {
  it("détecte une grande ville via le code postal", () => {
    expect(detecterGrandeVille("1 Rue de Rivoli, 75001 Paris")).toBe(true);
    expect(detecterGrandeVille("10 Rue X, 33000 Bordeaux")).toBe(true);
  });

  it("détecte tout le 92/93/94 par préfixe même hors liste explicite", () => {
    expect(detecterGrandeVille("1 Rue X, 92999 Inconnu")).toBe(true);
    expect(detecterGrandeVille("1 Rue X, 93999 Inconnu")).toBe(true);
    expect(detecterGrandeVille("1 Rue X, 94999 Inconnu")).toBe(true);
  });

  it("détecte une grande ville par nom de commune en absence de code postal exploitable", () => {
    expect(detecterGrandeVille("Bordeaux, France")).toBe(true);
  });

  it("ne matche pas un nom de commune inclus dans un mot plus long", () => {
    // "Niceville" ne doit pas être pris pour "Nice".
    expect(detecterGrandeVille("Niceville")).toBe(false);
  });

  it("retourne false pour une adresse hors grande ville", () => {
    expect(detecterGrandeVille("1 Rue de la Paix, 12345 Trifouillis-les-Oies")).toBe(false);
  });
});

describe("departementDepuisAdresse / departementDepuisCodePostal", () => {
  it("extrait le département depuis un code postal métropolitain, en retirant le zéro initial", () => {
    expect(departementDepuisCodePostal("01000")).toBe("1");
    expect(departementDepuisCodePostal("75001")).toBe("75");
  });

  it("extrait le département depuis une adresse complète", () => {
    expect(departementDepuisAdresse("15 Rue de la Paix, 75001 Paris")).toBe("75");
    expect(departementDepuisAdresse("Adresse sans code postal")).toBeNull();
  });

  it("gère les départements d'outre-mer sur 3 chiffres", () => {
    expect(departementDepuisCodePostal("97400")).toBe("974");
  });

  it("retourne une chaîne vide pour un code postal invalide", () => {
    expect(departementDepuisCodePostal("")).toBe("");
    expect(departementDepuisCodePostal("123")).toBe("");
  });
});

describe("estJourFerie / aMajorationHoraire", () => {
  it("reconnaît les jours fériés fixes", () => {
    expect(estJourFerie(new Date(2024, 0, 1))).toBe(true); // Nouvel An
    expect(estJourFerie(new Date(2024, 6, 14))).toBe(true); // Fête Nationale
    expect(estJourFerie(new Date(2024, 11, 25))).toBe(true); // Noël
  });

  it("reconnaît un jour ouvré normal comme non férié", () => {
    expect(estJourFerie(new Date(2024, 0, 15))).toBe(false);
  });

  it("calcule correctement le lundi de Pâques mobile (Pâques 2024 = 31 mars)", () => {
    expect(estJourFerie(new Date(2024, 3, 1))).toBe(true); // 1er avril 2024
    expect(estJourFerie(new Date(2024, 2, 31))).toBe(false); // Pâques (dimanche) n'est pas dans la liste elle-même
  });

  it("n'applique aucune majoration un jour ouvré en journée", () => {
    expect(aMajorationHoraire(WEEKDAY_DAYTIME)).toBe(false);
  });
});

describe("formatPrice", () => {
  it("formate un montant en euros au format français", () => {
    expect(formatPrice(13)).toContain("13");
    expect(formatPrice(13)).toContain("€");
  });
});
