import { XCircle, AlertTriangle } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_DESCRIPTIONS,
  getStatusStepState,
  type BookingStatus,
} from "~/lib/bookingStatus";

/**
 * Pure status display, extracted from BookingStatusCard: either a
 * cancelled/expired banner, or the step-dot progress timeline. No state, no
 * mutation — a booking's status in, a description of it out.
 */
export function BookingProgressTimeline({ status }: { status: BookingStatus }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
        <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        {STATUS_DESCRIPTIONS.cancelled}
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-700">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
        {STATUS_DESCRIPTIONS.expired}
      </div>
    );
  }

  return (
    <div>
      <ol className="flex items-center" aria-label={`Avancement : ${STATUS_LABELS[status]}`}>
        {STATUS_ORDER.map((step, i) => {
          const state = getStatusStepState(step, status);
          return (
            <li key={step} className="flex-1 flex items-center last:flex-none">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  state === "done" && "bg-brand-green-500",
                  state === "active" && "bg-brand-blue-600 ring-4 ring-brand-blue-100",
                  state === "pending" && "bg-gray-200"
                )}
                aria-current={state === "active" ? "step" : undefined}
              />
              {i < STATUS_ORDER.length - 1 && (
                <span
                  className={cn("h-0.5 flex-1", state === "done" ? "bg-brand-green-500" : "bg-gray-200")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2.5 text-sm text-gray-600">{STATUS_DESCRIPTIONS[status]}</p>
    </div>
  );
}
