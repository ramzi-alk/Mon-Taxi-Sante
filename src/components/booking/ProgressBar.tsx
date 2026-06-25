import { Check } from "lucide-react";
import { cn } from "~/lib/utils";
import { BOOKING_STEPS } from "./schema";

interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const progress = ((currentStep - 1) / (BOOKING_STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* Progress percentage & label */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          Étape {currentStep} sur {BOOKING_STEPS.length} —{" "}
          <span className="text-brand-blue-600">
            {BOOKING_STEPS[currentStep - 1].title}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
      </div>

      {/* Visual progress bar */}
      <div
        className="h-2 w-full rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={BOOKING_STEPS.length}
        aria-label={`Étape ${currentStep} sur ${BOOKING_STEPS.length}`}
      >
        <div
          className="h-full bg-gradient-to-r from-brand-blue-600 to-brand-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots — hidden on mobile, shown on md+ */}
      <nav
        className="hidden md:flex items-center justify-between mt-4"
        aria-label="Étapes du formulaire"
      >
        {BOOKING_STEPS.map((step) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-1"
              aria-current={isActive ? "step" : undefined}
            >
              <div
                className={cn(
                  "step-dot",
                  isDone && "step-dot-done",
                  isActive && "step-dot-active",
                  !isDone && !isActive && "step-dot-pending"
                )}
                aria-label={
                  isDone
                    ? `${step.shortTitle} (complété)`
                    : isActive
                    ? `${step.shortTitle} (en cours)`
                    : step.shortTitle
                }
              >
                {isDone ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs hidden lg:block",
                  isActive ? "text-brand-blue-600 font-semibold" : "text-muted-foreground"
                )}
              >
                {step.shortTitle}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
