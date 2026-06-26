import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation, MapPin, Loader2, X } from "lucide-react";
import { editBookingSchema, type EditBookingSchema } from "./editBookingSchema";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { Input } from "~/components/ui/input";
import { supabase } from "~/lib/supabase";
import { useToast } from "~/components/ui/toast";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { MyBookingRow, UpdateBookingPayload, LookupCredentials } from "~/repositories/bookingsRepository";

interface BookingEditFormProps {
  booking: MyBookingRow;
  /** When set, the edit proves ownership via reference_code + phone (lost-session recovery flow) instead of the live auth.uid() session. */
  lookupCredentials?: LookupCredentials;
  onClose: () => void;
  onSaved?: (payload: UpdateBookingPayload) => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultValuesFromBooking(booking: MyBookingRow): EditBookingSchema {
  return {
    pickup_address: booking.pickup_address,
    pickup_lat: booking.pickup_lat,
    pickup_lng: booking.pickup_lng,
    dropoff_address: booking.dropoff_address,
    dropoff_lat: booking.dropoff_lat,
    dropoff_lng: booking.dropoff_lng,
    pickup_date: toDateInputValue(booking.pickup_datetime),
    pickup_time: toTimeInputValue(booking.pickup_datetime),
    has_return: booking.trip_type === "aller_retour",
    return_date: booking.return_datetime ? toDateInputValue(booking.return_datetime) : "",
    return_time: booking.return_datetime ? toTimeInputValue(booking.return_datetime) : "",
    vehicle_type: booking.vehicle_type,
    trip_type: booking.trip_type,
    requires_wheelchair: booking.requires_wheelchair,
    requires_stretcher: booking.requires_stretcher,
    requires_oxygen: booking.requires_oxygen,
    passenger_count: booking.passenger_count,
    cpam_status: booking.cpam_status,
    mutual_name: booking.mutual_name ?? "",
    medical_notes: booking.medical_notes ?? "",
  };
}

const inputClass =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BookingEditForm({ booking, lookupCredentials, onClose, onSaved }: BookingEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<EditBookingSchema>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: defaultValuesFromBooking(booking),
  });

  const pickupAddress = watch("pickup_address");
  const dropoffAddress = watch("dropoff_address");
  const hasReturn = watch("has_return");
  const tripType = watch("trip_type");
  const passengerCount = watch("passenger_count");
  const isReturnTrip = hasReturn || tripType === "aller_retour";

  const updateMutation = useMutation({
    mutationFn: (data: EditBookingSchema) => {
      const payload: UpdateBookingPayload = {
        pickup_address: data.pickup_address,
        pickup_lat: data.pickup_lat,
        pickup_lng: data.pickup_lng,
        dropoff_address: data.dropoff_address,
        dropoff_lat: data.dropoff_lat,
        dropoff_lng: data.dropoff_lng,
        pickup_datetime: `${data.pickup_date}T${data.pickup_time}:00`,
        return_datetime:
          isReturnTrip && data.return_date && data.return_time
            ? `${data.return_date}T${data.return_time}:00`
            : null,
        vehicle_type: data.vehicle_type,
        trip_type: data.trip_type,
        requires_wheelchair: data.requires_wheelchair,
        requires_stretcher: data.requires_stretcher,
        requires_oxygen: data.requires_oxygen,
        passenger_count: data.passenger_count,
        cpam_status: data.cpam_status,
        mutual_name: data.mutual_name || null,
        medical_notes: data.medical_notes || null,
      };
      return lookupCredentials
        ? bookingsRepository.updateBookingByReference(
            supabase,
            lookupCredentials.referenceCode,
            lookupCredentials.phone,
            payload
          ).then(() => payload)
        : bookingsRepository.updateBooking(supabase, booking.id, payload).then(() => payload);
    },
    onSuccess: (payload) => {
      toast({ title: "Réservation modifiée", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      onSaved?.(payload);
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Impossible de modifier", description: err.message, variant: "error" });
    },
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`;

  return (
    <form
      onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
      className="border-t pt-4 space-y-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">Modifier la réservation</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la modification"
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Addresses */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="edit_pickup_address" className="text-xs font-semibold text-gray-700">
            Adresse de départ
          </label>
          <AddressAutocomplete
            id="edit_pickup_address"
            value={pickupAddress}
            onChange={(val) => {
              setValue("pickup_address", val);
              setValue("pickup_lat", null);
              setValue("pickup_lng", null);
            }}
            onSelect={(s) => {
              setValue("pickup_lat", s.lat);
              setValue("pickup_lng", s.lng);
              trigger("pickup_address");
            }}
            onBlur={() => trigger("pickup_address")}
            icon={<Navigation className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />}
          />
          {errors.pickup_address && (
            <p role="alert" className="text-xs text-red-600">{errors.pickup_address.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="edit_dropoff_address" className="text-xs font-semibold text-gray-700">
            Adresse de destination
          </label>
          <AddressAutocomplete
            id="edit_dropoff_address"
            value={dropoffAddress}
            onChange={(val) => {
              setValue("dropoff_address", val);
              setValue("dropoff_lat", null);
              setValue("dropoff_lng", null);
            }}
            onSelect={(s) => {
              setValue("dropoff_lat", s.lat);
              setValue("dropoff_lng", s.lng);
              trigger("dropoff_address");
            }}
            onBlur={() => trigger("dropoff_address")}
            icon={<MapPin className="h-4 w-4 text-red-500" aria-hidden="true" />}
          />
          {errors.dropoff_address && (
            <p role="alert" className="text-xs text-red-600">{errors.dropoff_address.message}</p>
          )}
        </div>
      </div>

      {/* Date / time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="edit_pickup_date" className="text-xs font-semibold text-gray-700">
            Date
          </label>
          <Input
            id="edit_pickup_date"
            type="date"
            min={minDateStr}
            {...register("pickup_date")}
            className="py-3"
          />
          {errors.pickup_date && (
            <p role="alert" className="text-xs text-red-600">{errors.pickup_date.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="edit_pickup_time" className="text-xs font-semibold text-gray-700">
            Heure
          </label>
          <Input
            id="edit_pickup_time"
            type="time"
            {...register("pickup_time")}
            className="py-3"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" {...register("has_return")} className="h-4 w-4 rounded border-gray-300" />
        Trajet aller-retour
      </label>

      {isReturnTrip && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit_return_date" className="text-xs font-semibold text-gray-700">
              Date de retour
            </label>
            <Input
              id="edit_return_date"
              type="date"
              min={minDateStr}
              {...register("return_date")}
              className="py-3"
            />
            {errors.return_date && (
              <p role="alert" className="text-xs text-red-600">{errors.return_date.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="edit_return_time" className="text-xs font-semibold text-gray-700">
              Heure de retour
            </label>
            <Input
              id="edit_return_time"
              type="time"
              {...register("return_time")}
              className="py-3"
            />
          </div>
        </div>
      )}

      {/* Vehicle / trip type / cpam */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="edit_vehicle_type" className="text-xs font-semibold text-gray-700">
            Véhicule
          </label>
          <select id="edit_vehicle_type" {...register("vehicle_type")} className={inputClass}>
            <option value="taxi">Taxi</option>
            <option value="vsl">VSL</option>
            <option value="pmr">Véhicule PMR</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="edit_trip_type" className="text-xs font-semibold text-gray-700">
            Nature du trajet
          </label>
          <select id="edit_trip_type" {...register("trip_type")} className={inputClass}>
            <option value="aller_simple">Aller simple</option>
            <option value="aller_retour">Aller-retour</option>
            <option value="multiple">Trajets multiples</option>
          </select>
        </div>
      </div>

      {/* Specific needs */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Besoins spécifiques</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register("requires_wheelchair")} className="h-4 w-4 rounded border-gray-300" />
            Fauteuil roulant
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register("requires_stretcher")} className="h-4 w-4 rounded border-gray-300" />
            Brancard
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register("requires_oxygen")} className="h-4 w-4 rounded border-gray-300" />
            Oxygène
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="edit_passenger_count" className="text-xs font-semibold text-gray-700">
          Nombre de passagers
        </label>
        <Input
          id="edit_passenger_count"
          type="number"
          min={1}
          max={8}
          value={passengerCount}
          onChange={(e) => setValue("passenger_count", Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
          className="py-3 max-w-[100px]"
        />
      </div>

      {/* CPAM / mutuelle */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="edit_cpam_status" className="text-xs font-semibold text-gray-700">
            Prise en charge
          </label>
          <select id="edit_cpam_status" {...register("cpam_status")} className={inputClass}>
            <option value="ald">ALD</option>
            <option value="cmu">CMU-C</option>
            <option value="css">CSS</option>
            <option value="standard">Assuré standard</option>
            <option value="none">Sans couverture</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="edit_mutual_name" className="text-xs font-semibold text-gray-700">
            Mutuelle (optionnel)
          </label>
          <Input id="edit_mutual_name" type="text" {...register("mutual_name")} className="py-3" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label htmlFor="edit_medical_notes" className="text-xs font-semibold text-gray-700">
          Message au chauffeur (optionnel)
        </label>
        <textarea
          id="edit_medical_notes"
          rows={3}
          {...register("medical_notes")}
          className={`${inputClass} resize-none`}
        />
        {errors.medical_notes && (
          <p role="alert" className="text-xs text-red-600">{errors.medical_notes.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-brand-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors"
        >
          {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Enregistrer les modifications
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={updateMutation.isPending}
          className="text-sm font-medium text-gray-500 hover:underline"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
