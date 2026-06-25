import { UseFormReturn } from "react-hook-form";
import { MessageSquare } from "lucide-react";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const suggestions = [
  "Patient dialysé, trajet fréquent",
  "Besoin d'aide pour les escaliers",
  "Anxieux durant les transports, merci d'être patient",
  "Rendez-vous en service oncologie",
  "Accompagnant présent",
];

export function Step9Notes({ form }: StepProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const notes = watch("medical_notes") ?? "";

  function appendSuggestion(text: string) {
    const current = notes.trim();
    setValue("medical_notes", current ? `${current}. ${text}` : text);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Informations complémentaires
        </h2>
        <p className="mt-1 text-muted-foreground">
          Partagez avec le chauffeur tout élément qui facilitera votre prise en charge.
          Ces informations restent strictement confidentielles.
        </p>
      </div>

      {/* Suggestions */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Suggestions rapides :
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => appendSuggestion(s)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-blue-300 hover:bg-brand-blue-50 hover:text-brand-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <label
          htmlFor="medical_notes"
          className="flex items-center gap-2 text-sm font-semibold text-gray-700"
        >
          <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Message au chauffeur
        </label>
        <textarea
          id="medical_notes"
          rows={5}
          placeholder="Ex : Je serai en fauteuil au rez-de-chaussée. Mon rendez-vous est en service cardiologie bâtiment B. Merci de sonner à l'interphone."
          aria-describedby="notes-counter"
          {...register("medical_notes")}
          className="w-full rounded-xl border border-input bg-white px-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
        <div className="flex items-center justify-between">
          {errors.medical_notes && (
            <p role="alert" className="text-sm text-red-600">
              {errors.medical_notes.message}
            </p>
          )}
          <p
            id="notes-counter"
            className="ml-auto text-xs text-muted-foreground"
            aria-live="polite"
          >
            {notes.length}/500 caractères
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-800">
        <strong>Presque terminé&nbsp;!</strong> L&apos;étape suivante vous présentera
        un récapitulatif complet de votre réservation avant confirmation définitive.
      </div>
    </div>
  );
}
