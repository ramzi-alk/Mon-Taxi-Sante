import { AlertTriangle, RotateCw } from "lucide-react";

export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50 transition-colors"
      >
        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
        Réessayer
      </button>
    </div>
  );
}
