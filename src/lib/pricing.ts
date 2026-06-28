// CPAM taxi conventionné pricing — Convention nationale 2025–2029
// Applicable depuis le 1er novembre 2025 (arrêté du 29 juillet 2025)

// ---------------------------------------------------------------------------
// Tarifs kilométriques départementaux (source: annexe convention 2025, p.18)
// Clés = code département INSEE (sans zéro préfixé pour 01-09 sauf 2A/2B)
// ---------------------------------------------------------------------------
export const TARIFS_KM_DEPARTEMENT: Record<string, number> = {
  "1": 1.13,  "2": 1.20,  "3": 1.19,  "4": 1.14,  "5": 1.18,
  "6": 1.27,  "7": 1.17,  "8": 1.17,  "9": 1.15,  "10": 1.13,
  "11": 1.08, "12": 1.16, "13": 1.10, "14": 1.07, "15": 1.13,
  "16": 1.12, "17": 1.10, "18": 1.26, "19": 1.16,
  "2A": 1.27, "2B": 1.27,
  "21": 1.12, "22": 1.13, "23": 1.18, "24": 1.11, "25": 1.08,
  "26": 1.16, "27": 1.21, "28": 1.19, "29": 1.07, "30": 1.08,
  "31": 1.10, "32": 1.19, "33": 1.07, "34": 1.07, "35": 1.07,
  "36": 1.25, "37": 1.18, "38": 1.22, "39": 1.11, "40": 1.13,
  "41": 1.13, "42": 1.08, "43": 1.24, "44": 1.08, "45": 1.07,
  "46": 1.13, "47": 1.11, "48": 1.25, "49": 1.08, "50": 1.16,
  "51": 1.12, "52": 1.26, "53": 1.09, "54": 1.09, "55": 1.12,
  "56": 1.07, "57": 1.14, "58": 1.27, "59": 1.20, "60": 1.20,
  "61": 1.17, "62": 1.20, "63": 1.08, "64": 1.14, "65": 1.07,
  "66": 1.18, "67": 1.07, "68": 1.07, "69": 1.07, "70": 1.08,
  "71": 1.10, "72": 1.07, "73": 1.15, "74": 1.22, "75": 1.22,
  "76": 1.18, "77": 1.07, "78": 1.07, "79": 1.08, "80": 1.15,
  "81": 1.07, "82": 1.07, "83": 1.16, "84": 1.20, "85": 1.07,
  "86": 1.11, "87": 1.10, "88": 1.10, "89": 1.11, "90": 1.08,
  "91": 1.07, "92": 1.07, "93": 1.07, "94": 1.07, "95": 1.07,
  // DOM (hors règles métropole — taux seulement, règles spécifiques non implémentées)
  "971": 1.07, "972": 1.20, "973": 1.10, "974": 1.22, "976": 0.00,
};

// Tarif de repli si le département n'est pas trouvé (médiane nationale ~1.10)
const TARIF_KM_DEFAUT = 1.10;

// ---------------------------------------------------------------------------
// Détection grande ville (convention 2025, arrêté du 29/07/2025 + liste CNAM 01/04/2026)
// ---------------------------------------------------------------------------

// Codes postaux reconnus comme grande ville (communes + établissements par extension)
const GRANDE_VILLE_CODES_POSTAUX = new Set([
  // Paris
  "75001","75002","75003","75004","75005","75006","75007","75008","75009","75010",
  "75011","75012","75013","75014","75015","75016","75017","75018","75019","75020",
  // Dép. 92 (Hauts-de-Seine) — tout le département
  "92000","92100","92110","92120","92130","92140","92150","92160","92170","92180",
  "92190","92200","92210","92220","92230","92240","92250","92260","92270","92290",
  "92300","92310","92320","92330","92340","92350","92360","92370","92380","92390",
  "92400","92410","92420","92430","92500","92600","92700","92800",
  // Dép. 93 (Seine-Saint-Denis) — tout le département
  "93000","93100","93110","93120","93130","93140","93150","93160","93170","93190",
  "93200","93210","93220","93230","93240","93260","93270","93290","93300","93310",
  "93320","93330","93340","93350","93360","93370","93380","93390","93400","93420",
  "93430","93440","93450","93460","93470","93500","93600","93700","93800",
  // Dép. 94 (Val-de-Marne) — tout le département
  "94000","94100","94110","94120","94130","94140","94150","94160","94170","94180",
  "94190","94200","94210","94220","94230","94240","94250","94260","94270","94300",
  "94310","94320","94340","94350","94360","94370","94380","94390","94400","94410",
  "94420","94430","94440","94450","94460","94470","94480","94490","94500","94510",
  "94520","94550","94600","94700","94800","94880",
  // Bordeaux (33)
  "33000","33100","33200","33300","33800",
  "33270", // Floirac
  "33520", // Bruges
  "33600", // Pessac
  "33310", // Lormont
  "33110", // Le Bouscat
  "33185", // Le Haillan
  "33400", // Talence
  // Grenoble (38)
  "38000","38100",
  "38700", // La Tronche
  "38130", // Échirolles
  // Lille (59)
  "59000","59800",
  "59120", // Loos
  "59491","59650", // Villeneuve-d'Ascq
  "59155", // Faches-Thumesnil
  "59130", // Lambersart
  "59370", // Mons-en-Barœul
  "59160", // Lomme
  // Lyon (69)
  "69001","69002","69003","69004","69005","69006","69007","69008","69009",
  "69300", // Caluire-et-Cuire
  "69100", // Villeurbanne
  "69500", // Bron
  "69130", // Écully
  "69110", // Sainte-Foy-lès-Lyon
  // Marseille (13)
  "13001","13002","13003","13004","13005","13006","13007","13008",
  "13009","13010","13011","13012","13013","13014","13015","13016",
  // Montpellier (34)
  "34000","34070","34080","34090",
  "34430", // Saint-Jean-de-Védas
  "34170", // Castelnau-le-Lez
  "34790", // Grabels
  // Nantes (44)
  "44000","44100","44200","44300",
  "44800", // Saint-Herblain
  "44400", // Rezé
  // Nice (06)
  "06000","06100","06200","06300",
  "06700", // Saint-Laurent-du-Var
  // Rennes (35)
  "35000","35200",
  "35510", // Cesson-Sévigné
  "35760", // Saint-Grégoire + Montgermont
  "35135", // Chantepie
  // Strasbourg (67)
  "67000","67100",
  "67300", // Schiltigheim
  "67400", // Illkirch-Graffenstaden
  // Toulouse (31)
  "31000","31100","31200","31300","31400","31500",
  "31130", // Quint-Fonsegrives
  "31240", // Saint-Jean (Haute-Garonne)
]);

// Noms de communes normalisés (sans accents, minuscules, tirets→espaces)
// Utilisés en secours si le code postal n'est pas dans l'adresse
const GRANDE_VILLE_COMMUNES_NORMALISEES = new Set([
  "bordeaux","floirac","bruges","pessac","lormont","le bouscat","le haillan","talence",
  "grenoble","la tronche","echirolles",
  "lille","loos","villeneuve d ascq","faches thumesnil","lambersart","mons en baroeul","lomme",
  "lyon","caluire et cuire","villeurbanne","bron","ecully","sainte foy les lyon",
  "marseille",
  "montpellier","saint jean de vedas","castelnau le lez","grabels",
  "nantes","saint herblain","reze",
  "nice","saint laurent du var",
  "paris",
  "rennes","cesson sevigne","saint gregoire","chantepie","montgermont",
  "strasbourg","schiltigheim","illkirch graffenstaden","illkirch",
  "toulouse","quint fonsegrives",
]);

function normaliserCommune(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Détecte si une adresse correspond à une grande ville ou un de ses établissements. */
export function detecterGrandeVille(address: string): boolean {
  // 1. Chercher le code postal dans l'adresse (5 chiffres)
  const matchPostal = address.match(/\b(\d{5})\b/);
  if (matchPostal) {
    if (GRANDE_VILLE_CODES_POSTAUX.has(matchPostal[1])) return true;
    // Dép. 92/93/94 par préfixe postal (complète la liste ci-dessus)
    const pref = matchPostal[1].slice(0, 2);
    if (pref === "92" || pref === "93" || pref === "94") return true;
  }

  // 2. Fallback par nom de commune normalisé
  const norm = normaliserCommune(address);
  for (const commune of GRANDE_VILLE_COMMUNES_NORMALISEES) {
    // Cherche le nom exact avec délimiteurs (pas de faux positif type "nice" dans "niceville")
    const re = new RegExp(`(^|[\\s,])${commune}([\\s,]|$)`);
    if (re.test(norm)) return true;
  }

  return false;
}

/** Extrait le code département INSEE depuis un code postal 5 chiffres. */
export function departementDepuisCodePostal(postalCode: string): string {
  if (!postalCode || postalCode.length < 5) return "";
  const prefix2 = postalCode.slice(0, 2);
  // Corse
  if (prefix2 === "20") {
    const prefix3 = postalCode.slice(0, 3);
    return parseInt(prefix3, 10) >= 200 && parseInt(prefix3, 10) <= 200 ? "2A" : "2B";
  }
  // DOM
  if (prefix2 === "97") return postalCode.slice(0, 3);
  return prefix2.replace(/^0/, ""); // "01" → "1"
}

// ---------------------------------------------------------------------------
// Jours fériés français (algorithme de Gauss/Meeus pour Pâques)
// ---------------------------------------------------------------------------
function dateEaques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

function memeJour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function estJourFerie(date: Date): boolean {
  const j = date.getDate();
  const m = date.getMonth() + 1;
  const a = date.getFullYear();

  // Jours fériés fixes
  if (m === 1  && j === 1)  return true; // Nouvel An
  if (m === 5  && j === 1)  return true; // Fête du Travail
  if (m === 5  && j === 8)  return true; // Victoire 1945
  if (m === 7  && j === 14) return true; // Fête Nationale
  if (m === 8  && j === 15) return true; // Assomption
  if (m === 11 && j === 1)  return true; // Toussaint
  if (m === 11 && j === 11) return true; // Armistice
  if (m === 12 && j === 25) return true; // Noël

  // Jours fériés variables (calculés depuis Pâques)
  const paques = dateEaques(a);
  const lundiPaques  = new Date(paques); lundiPaques.setDate(paques.getDate() + 1);
  const ascension    = new Date(paques); ascension.setDate(paques.getDate() + 39);
  const pentecote    = new Date(paques); pentecote.setDate(paques.getDate() + 50);

  return memeJour(date, lundiPaques) || memeJour(date, ascension) || memeJour(date, pentecote);
}

/**
 * Détermine si une majoration horaire de 50 % s'applique.
 * Plages : 20h–8h | samedi après 12h | dimanche | jours fériés
 */
export function aMajorationHoraire(pickupDatetime: string | Date): boolean {
  const dt = typeof pickupDatetime === "string" ? new Date(pickupDatetime) : pickupDatetime;
  const heure = dt.getHours();
  const jourSemaine = dt.getDay(); // 0=dim, 6=sam

  if (heure >= 20 || heure < 8) return true;
  if (jourSemaine === 0) return true;
  if (jourSemaine === 6 && heure >= 12) return true;
  if (estJourFerie(dt)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PricingInput {
  /** Distance réelle du trajet patient (Google Maps), en km. */
  distanceKm: number;
  /** Code département de l'ADS (autorisation de stationnement) du taxi. */
  codeDepartement: string;
  /** Adresse de prise en charge (pour détecter le forfait grande ville). */
  adresseDepart?: string;
  /** Adresse de destination (pour détecter le forfait grande ville). */
  adresseArrivee?: string;
  /** Date/heure de prise en charge ISO 8601 (pour majoration horaire). */
  pickupDatetime: string;
  /** Statut de prise en charge CPAM du patient. */
  cpamStatus: "ald" | "cmu" | "css" | "standard" | "none";
  /** Retour à vide : trajet lié à une hospitalisation ou soins répétés (dialyse, chimio, radio). */
  retourAVide?: boolean;
  /** Supplément TPMR — transport avec aide particulière (fauteuil roulant, etc.). */
  tpmr?: boolean;
  /** Montant des péages à rembourser sur justificatif (€). */
  peage?: number;
  /**
   * Nombre de patients transportés simultanément (transport partagé).
   * 1 = solo, 2 → abattement 23 %, 3 → 35 %, 4+ → 37 %.
   */
  nbPatients?: number;
}

export interface PricingResult {
  // Composantes tarifaires
  forfaitBase: number;         // 13 € — prise en charge + 4 km inclus
  forfaitGrandeVille: number;  // 0 ou 15 €
  montantKm: number;           // km facturables × tarif/km
  montantRetourVide: number;   // km retour vide × tarif majoré
  majorationHoraire: number;   // 50 % sur (forfaits + km + retour vide)
  supplementTpmr: number;      // 30 € si TPMR
  peage: number;               // Péages sur justificatif
  abattementPartage: number;   // Abattement transport partagé (valeur négative)

  // Totaux
  totalBrut: number;           // Avant abattement partage
  total: number;               // Net à facturer
  prixCpam: number;            // Part Assurance Maladie
  partPatient: number;         // Reste à charge patient

  // Détail technique (utile pour affichage ou audit)
  details: {
    grandeVilleDetectee: boolean;
    majoHoraireAppliquee: boolean;
    tauxMajoHoraire: number;        // 0 ou 0.5
    kmFacturables: number;          // distance - 4 (plancher 0)
    tarifKmDept: number;            // €/km pour le département
    retourVideApplique: boolean;
    majorationRetourVide: number;   // 0, 0.25 ou 0.50
    abattementTaux: number;         // 0, 0.23, 0.35 ou 0.37
  };
}

// ---------------------------------------------------------------------------
// Constantes convention 2025
// ---------------------------------------------------------------------------
const FORFAIT_BASE = 13;          // € (inclut 4 km)
const KM_INCLUS_FORFAIT = 4;     // km gratuits dans le forfait
const FORFAIT_GRANDE_VILLE = 15; // €
const SUPPLEMENT_TPMR = 30;      // €
const TAUX_MAJORATION_HORAIRE = 0.50;

const CPAM_TAUX: Record<PricingInput["cpamStatus"], number> = {
  ald: 1.00,
  cmu: 1.00,
  css: 1.00,
  standard: 0.65,
  none: 0.00,
};

const ABATTEMENT_PARTAGE: Record<number, number> = {
  2: 0.23,
  3: 0.35,
};
const ABATTEMENT_PARTAGE_MAX = 0.37; // 4 patients et plus

// ---------------------------------------------------------------------------
// Calcul principal — Convention nationale taxi 2025
// ---------------------------------------------------------------------------
export function calculatePrice(input: PricingInput): PricingResult {
  const {
    distanceKm,
    codeDepartement,
    adresseDepart = "",
    adresseArrivee = "",
    pickupDatetime,
    cpamStatus,
    retourAVide = false,
    tpmr = false,
    peage = 0,
    nbPatients = 1,
  } = input;

  // 1. Tarif kilométrique du département (ADS)
  const tarifKmDept = TARIFS_KM_DEPARTEMENT[codeDepartement] ?? TARIF_KM_DEFAUT;

  // 2. Forfait grande ville (une seule fois par trajet)
  const grandeVilleDetectee =
    detecterGrandeVille(adresseDepart) || detecterGrandeVille(adresseArrivee);
  const forfaitGrandeVille = grandeVilleDetectee ? FORFAIT_GRANDE_VILLE : 0;

  // 3. Kilomètres facturables (au-delà des 4 inclus dans le forfait)
  const kmFacturables = Math.max(0, distanceKm - KM_INCLUS_FORFAIT);
  const montantKm = kmFacturables * tarifKmDept;

  // 4. Retour à vide (hospitalisation / soins répétés)
  // Majoration 25 % si trajet ≤ 49 km, 50 % si ≥ 50 km
  let majorationRetourVide = 0;
  let montantRetourVide = 0;
  if (retourAVide && distanceKm > 0) {
    majorationRetourVide = distanceKm <= 49 ? 0.25 : 0.50;
    // Les km retour = distance totale, aucun forfait ne s'applique au retour à vide
    montantRetourVide = distanceKm * tarifKmDept * (1 + majorationRetourVide);
  }

  // 5. Base sur laquelle s'applique la majoration horaire
  const baseAvantMajoration = FORFAIT_BASE + forfaitGrandeVille + montantKm + montantRetourVide;

  // 6. Majoration horaire 50 % (nuit, samedi après 12h, dimanche, jours fériés)
  const majoHoraireAppliquee = aMajorationHoraire(pickupDatetime);
  const majorationHoraire = majoHoraireAppliquee
    ? baseAvantMajoration * TAUX_MAJORATION_HORAIRE
    : 0;

  // 7. Suppléments hors majoration horaire
  const supplementTpmr = tpmr ? SUPPLEMENT_TPMR : 0;
  const montantPeage = Math.max(0, peage);

  // 8. Total brut (avant abattement partage)
  const totalBrut =
    baseAvantMajoration + majorationHoraire + supplementTpmr + montantPeage;

  // 9. Abattement transport partagé
  const abattementTaux =
    nbPatients >= 4
      ? ABATTEMENT_PARTAGE_MAX
      : ABATTEMENT_PARTAGE[nbPatients] ?? 0;
  // L'abattement s'applique hors TPMR et péages (interprétation standard)
  const abattementBase = baseAvantMajoration + majorationHoraire;
  const abattementPartage = -(abattementBase * abattementTaux);

  const total = totalBrut + abattementPartage;

  // 10. Répartition CPAM / patient
  const tauxCpam = CPAM_TAUX[cpamStatus];
  const prixCpam = total * tauxCpam;
  const partPatient = total - prixCpam;

  const arrondir = (v: number) => Math.round(v * 100) / 100;

  return {
    forfaitBase:         arrondir(FORFAIT_BASE),
    forfaitGrandeVille:  arrondir(forfaitGrandeVille),
    montantKm:           arrondir(montantKm),
    montantRetourVide:   arrondir(montantRetourVide),
    majorationHoraire:   arrondir(majorationHoraire),
    supplementTpmr:      arrondir(supplementTpmr),
    peage:               arrondir(montantPeage),
    abattementPartage:   arrondir(abattementPartage),
    totalBrut:           arrondir(totalBrut),
    total:               arrondir(total),
    prixCpam:            arrondir(prixCpam),
    partPatient:         arrondir(partPatient),
    details: {
      grandeVilleDetectee,
      majoHoraireAppliquee,
      tauxMajoHoraire:      majoHoraireAppliquee ? TAUX_MAJORATION_HORAIRE : 0,
      kmFacturables:        arrondir(kmFacturables),
      tarifKmDept,
      retourVideApplique:   retourAVide && distanceKm > 0,
      majorationRetourVide,
      abattementTaux,
    },
  };
}

/** Formate un montant en euros (fr-FR). */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
