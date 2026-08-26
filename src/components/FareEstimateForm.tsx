import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Calculator, Loader2, MapPin, Navigation, Route } from "lucide-react";
import { AddressAutocomplete } from "~/components/booking/AddressAutocomplete";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { getDrivingDistanceKm } from "~/lib/mapbox";
import { supabase } from "~/lib/supabase";
import { formatPrice } from "~/lib/utils";
import { logger } from "~/lib/logger";
import departments from "~/data/seo/departments.json";

const AUTO_DEPARTMENT = "auto";

function nowForDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * Estimateur de prix autonome (hors tunnel de réservation), pour /tarifs-cpam.
 * Distance réelle (Mapbox Directions) + tarif calculé par la même RPC
 * `compute_booking_price` que la réservation, pour rester la seule source de
 * vérité sur la formule tarifaire (convention 2025).
 */
export function FareEstimateForm() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isComputingDistance, setIsComputingDistance] = useState(false);

  const [pickupDatetime, setPickupDatetime] = useState(nowForDatetimeLocal);
  const [requiresWheelchair, setRequiresWheelchair] = useState(false);
  const [isHospitalization, setIsHospitalization] = useState(false);
  const [departmentOverride, setDepartmentOverride] = useState(AUTO_DEPARTMENT);

  const [price, setPrice] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // Distance routière réelle, dès que les deux adresses sont géolocalisées.
  useEffect(() => {
    if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
      setDistanceKm(null);
      return;
    }

    let cancelled = false;
    setIsComputingDistance(true);
    getDrivingDistanceKm({ lat: pickupLat, lng: pickupLng }, { lat: dropoffLat, lng: dropoffLng })
      .then((km) => {
        if (!cancelled) setDistanceKm(km);
      })
      .catch((err) => {
        logger.warn("fare_estimate.distance_failed", { error: (err as Error).message });
      })
      .finally(() => {
        if (!cancelled) setIsComputingDistance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  // Tarif, dès qu'on a une distance — recalculé à chaque changement d'option.
  // Petit débounce : le champ date/heure peut émettre plusieurs onChange
  // rapprochés selon le navigateur.
  useEffect(() => {
    if (distanceKm == null) {
      setPrice(null);
      setEstimateError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsEstimating(true);
      setEstimateError(null);
      try {
        const { data, error } = await supabase.rpc("compute_booking_price", {
          p_distance_km: distanceKm,
          p_vehicle_type: "taxi",
          p_trip_type: "aller_simple",
          p_requires_wheelchair: requiresWheelchair,
          p_pickup_datetime: new Date(pickupDatetime).toISOString(),
          p_is_hospitalization: isHospitalization,
          p_pickup_address: pickupAddress,
          p_dropoff_address: dropoffAddress,
          p_departement_override:
            departmentOverride === AUTO_DEPARTMENT ? undefined : departmentOverride,
        });
        if (cancelled) return;
        if (error) {
          logger.warn("fare_estimate.price_failed", { error: error.message });
          setEstimateError("Impossible de calculer une estimation pour le moment.");
          setPrice(null);
        } else {
          setPrice(data as number);
        }
      } finally {
        if (!cancelled) setIsEstimating(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    distanceKm,
    pickupAddress,
    dropoffAddress,
    pickupDatetime,
    requiresWheelchair,
    isHospitalization,
    departmentOverride,
  ]);

  function swapAddresses() {
    setPickupAddress(dropoffAddress);
    setPickupLat(dropoffLat);
    setPickupLng(dropoffLng);
    setDropoffAddress(pickupAddress);
    setDropoffLat(pickupLat);
    setDropoffLng(pickupLng);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
        <h3 className="text-lg font-bold text-[#0B0F1C]">Estimez le prix de votre course</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Renseignez vos deux adresses : le tarif s&apos;affiche automatiquement, calculé selon la
        même formule que celle appliquée à la réservation (convention CPAM 2025).
      </p>

      <div className="space-y-4">
        {/* Départ */}
        <div className="space-y-1.5">
          <label htmlFor="estimate-pickup" className="block text-sm font-semibold text-gray-700">
            Adresse de départ
          </label>
          <AddressAutocomplete
            id="estimate-pickup"
            value={pickupAddress}
            onChange={(val) => {
              setPickupAddress(val);
              setPickupLat(null);
              setPickupLng(null);
            }}
            onSelect={(suggestion) => {
              setPickupLat(suggestion.lat);
              setPickupLng(suggestion.lng);
            }}
            placeholder="Ex : 15 Rue de la Paix, 75001 Paris"
            icon={<Navigation className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />}
          />
        </div>

        {/* Swap */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swapAddresses}
            className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Inverser les adresses de départ et d'arrivée"
          >
            <ArrowDown className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
            Inverser
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Arrivée */}
        <div className="space-y-1.5">
          <label htmlFor="estimate-dropoff" className="block text-sm font-semibold text-gray-700">
            Adresse d&apos;arrivée
          </label>
          <AddressAutocomplete
            id="estimate-dropoff"
            value={dropoffAddress}
            onChange={(val) => {
              setDropoffAddress(val);
              setDropoffLat(null);
              setDropoffLng(null);
            }}
            onSelect={(suggestion) => {
              setDropoffLat(suggestion.lat);
              setDropoffLng(suggestion.lng);
            }}
            placeholder="Ex : Hôpital Lariboisière, Paris"
            icon={<MapPin className="h-5 w-5 text-red-500" aria-hidden="true" />}
          />
        </div>

        {/* Options affectant le tarif */}
        <div className="grid gap-3 sm:grid-cols-2 pt-1">
          <div className="space-y-1.5">
            <label htmlFor="estimate-datetime" className="block text-xs font-semibold text-gray-700">
              Date et heure prévues
            </label>
            <Input
              id="estimate-datetime"
              type="datetime-local"
              value={pickupDatetime}
              onChange={(e) => setPickupDatetime(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="estimate-department" className="block text-xs font-semibold text-gray-700">
              Département de rattachement CPAM
            </label>
            <Select value={departmentOverride} onValueChange={setDepartmentOverride}>
              <SelectTrigger id="estimate-department" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_DEPARTMENT}>Automatique (déduit de l&apos;adresse)</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.code} — {d.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label htmlFor="estimate-wheelchair" className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <Checkbox
              id="estimate-wheelchair"
              checked={requiresWheelchair}
              onCheckedChange={(checked) => setRequiresWheelchair(checked === true)}
            />
            Fauteuil roulant (+30 €)
          </label>
          <label htmlFor="estimate-hospitalization" className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <Checkbox
              id="estimate-hospitalization"
              checked={isHospitalization}
              onCheckedChange={(checked) => setIsHospitalization(checked === true)}
            />
            Retour à vide (hospitalisation, dialyse, chimio…)
          </label>
        </div>
        <p className="text-xs text-gray-400">
          Par défaut, le tarif/km est déduit du code postal de l&apos;adresse de départ. Choisissez
          explicitement le département si votre chauffeur est rattaché à une ADS différente.
        </p>
      </div>

      {/* Résultat */}
      <div
        className="mt-6 rounded-xl bg-[#F7F8FC] border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-sm">
          {isComputingDistance ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />
              <span className="text-gray-500">Calcul de la distance…</span>
            </>
          ) : distanceKm != null ? (
            <>
              <Route className="h-4 w-4 text-[#1244E8]" aria-hidden="true" />
              <span className="text-gray-600">
                Distance estimée : <strong className="text-[#0B0F1C]">{distanceKm} km</strong> (trajet routier)
              </span>
            </>
          ) : (
            <span className="text-gray-400">Saisissez les deux adresses pour lancer l&apos;estimation.</span>
          )}
        </div>

        <div className="text-right">
          {estimateError ? (
            <p role="alert" className="text-sm text-red-600">
              {estimateError}
            </p>
          ) : isEstimating ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Calcul du tarif…
            </span>
          ) : price != null ? (
            <p className="text-3xl font-black text-[#1244E8]">{formatPrice(price)}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Estimation indicative hors frais de péage — le tarif définitif reste celui du compteur
        horokilométrique agréé le jour du transport. En ALD, maternité ou CMU-C avec Prescription
        Médicale de Transport, ce montant est pris en charge à 100 % par le Tiers-Payant.
      </p>

      <Link
        to="/reservation"
        className="btn-cta mt-5 inline-flex items-center justify-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors font-bold"
      >
        Réserver ce trajet
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </div>
  );
}
