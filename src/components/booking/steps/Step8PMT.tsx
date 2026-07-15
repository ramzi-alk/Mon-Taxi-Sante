import { UseFormReturn } from "react-hook-form";
import { FileText, Upload, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

export function Step8PMT({ form }: StepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const pmtDeclared = watch("pmt_declared");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setValue("pmt_file", file);
    setValue("pmt_declared", true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Prescription Médicale de Transport (PMT)
        </h2>
        <p className="mt-1 text-muted-foreground">
          La PMT est le document établi par votre médecin qui autorise votre prise
          en charge pour le transport médical.
        </p>
      </div>

      {/* What is PMT */}
      <Accordion type="single" collapsible className="rounded-xl bg-blue-50 border border-blue-100 px-4">
        <AccordionItem value="what-is-pmt">
          <AccordionTrigger className="py-4 text-sm text-blue-900">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-blue-600 shrink-0" aria-hidden="true" />
              Qu&apos;est-ce que la PMT&nbsp;?
            </span>
          </AccordionTrigger>
          <AccordionContent className="pl-7 text-sm text-blue-900">
            La Prescription Médicale de Transport est une ordonnance spéciale que
            votre médecin remplit pour justifier votre besoin de transport médical
            auprès de la Sécurité Sociale. Elle précise le motif médical, le type
            de véhicule et la fréquence des trajets.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Do you have PMT? */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          Avez-vous une prescription médicale de transport&nbsp;?{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: true, label: "Oui, j'ai une PMT", icon: CheckCircle2, color: "text-brand-green-600" },
            { value: false, label: "Non / Je dois l'obtenir", icon: AlertCircle, color: "text-amber-600" },
          ].map(({ value, label, icon: Icon, color }) => {
            const isSelected = pmtDeclared === value;
            return (
              <label
                key={String(value)}
                htmlFor={`pmt-${value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all",
                  isSelected
                    ? "border-brand-blue-500 bg-brand-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  id={`pmt-${value}`}
                  checked={isSelected}
                  onChange={() => setValue("pmt_declared", value)}
                  className="sr-only"
                />
                <Icon className={cn("h-5 w-5 shrink-0", color)} aria-hidden="true" />
                <span className="font-semibold text-gray-800">{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* If no PMT — guidance */}
      {pmtDeclared === false && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <Accordion type="single" collapsible className="px-4">
            <AccordionItem value="how-to-get-pmt">
              <AccordionTrigger className="py-4 font-semibold">
                Comment obtenir votre PMT&nbsp;?
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside space-y-1 text-amber-800">
                  <li>Demandez à votre médecin traitant lors de votre prochain rendez-vous</li>
                  <li>Précisez votre destination médicale et la fréquence des soins</li>
                  <li>Transmettez-nous la prescription avant votre premier trajet</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <p className="px-4 pb-4">
            Vous pouvez tout de même finaliser votre réservation. Nous vous
            contacterons pour récupérer la PMT.
          </p>
        </div>
      )}

      {/* File upload — only if PMT declared */}
      {pmtDeclared && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Téléverser votre PMT{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (photo ou scan — JPG, PNG, PDF)
            </span>
          </p>

          <label
            htmlFor="pmt_file_input"
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors cursor-pointer",
              dragOver
                ? "border-brand-blue-400 bg-brand-blue-50"
                : fileName
                ? "border-brand-green-400 bg-brand-green-50"
                : "border-gray-300 bg-gray-50 hover:border-brand-blue-300 hover:bg-brand-blue-50/30"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileChange(file);
            }}
          >
            <input
              id="pmt_file_input"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="sr-only"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              aria-label="Téléverser votre prescription médicale de transport"
            />
            {fileName ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-brand-green-500" aria-hidden="true" />
                <div className="text-center">
                  <p className="font-semibold text-brand-green-700">{fileName}</p>
                  <p className="text-sm text-brand-green-600">Fichier ajouté avec succès</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-gray-400" aria-hidden="true" />
                <div className="text-center">
                  <p className="font-semibold text-gray-700">
                    Glissez votre fichier ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG ou PDF — max 10 Mo
                  </p>
                </div>
              </>
            )}
          </label>
          {errors.pmt_file && (
            <p role="alert" className="text-sm text-red-600">
              {errors.pmt_file.message as string}
            </p>
          )}
        </div>
      )}

      <Accordion type="single" collapsible>
        <AccordionItem value="pmt-confidentiality">
          <AccordionTrigger className="text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Confidentialité de vos documents
            </span>
          </AccordionTrigger>
          <AccordionContent className="pl-5 text-xs text-muted-foreground">
            Vos documents médicaux sont stockés de manière chiffrée sur un serveur HDS
            certifié. Ils ne sont accessibles qu&apos;au chauffeur assigné et au personnel
            administratif autorisé.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
