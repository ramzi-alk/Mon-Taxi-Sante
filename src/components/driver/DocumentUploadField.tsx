import { useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Upload, ExternalLink, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type DocumentStatus = "missing" | "no-expiry" | "valid" | "expiring-soon" | "expired";

function computeStatus(path: string | null, expiresAt: string | null | undefined): DocumentStatus {
  if (!path) return "missing";
  if (expiresAt === undefined) return "no-expiry"; // ce document n'a pas de notion d'expiration
  if (expiresAt === null) return "no-expiry"; // déposé, mais date non renseignée
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring-soon";
  return "valid";
}

const STATUS_BADGE: Record<DocumentStatus, { label: string; className: string; icon: React.FC<{ className?: string }> } | null> = {
  missing: null,
  "no-expiry": { label: "Déposé", className: "bg-brand-blue-50 text-brand-blue-700", icon: CheckCircle2 },
  valid: { label: "Valide", className: "bg-brand-green-50 text-brand-green-700", icon: CheckCircle2 },
  "expiring-soon": { label: "Expire bientôt", className: "bg-amber-50 text-amber-700", icon: AlertTriangle },
  expired: { label: "Expiré", className: "bg-red-50 text-red-700", icon: XCircle },
};

interface DocumentUploadFieldProps {
  label: string;
  path: string | null;
  // undefined = ce type de document n'a pas de date d'expiration (permis) ;
  // null = a une date mais pas encore renseignée ; string = date ISO.
  expiresAt?: string | null;
  onExpiryChange?: (date: string | null) => void;
  onUpload: (file: File) => void;
  onView: () => Promise<string>;
  isUploading: boolean;
}

export function DocumentUploadField({
  label,
  path,
  expiresAt,
  onExpiryChange,
  onUpload,
  onView,
  isUploading,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpeningLink, setIsOpeningLink] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const status = computeStatus(path, expiresAt);
  const badge = STATUS_BADGE[status];

  async function handleView() {
    setViewError(null);
    setIsOpeningLink(true);
    try {
      const url = await onView();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setViewError("Impossible de générer le lien. Réessayez.");
    } finally {
      setIsOpeningLink(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {badge && (
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
            <badge.icon className="h-3 w-3" aria-hidden="true" />
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {path && (
          <button
            type="button"
            onClick={handleView}
            disabled={isOpeningLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {isOpeningLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
            Voir
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
          {path ? "Remplacer" : "Ajouter un document"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {viewError && <p className="text-xs text-red-600">{viewError}</p>}

      {expiresAt !== undefined && onExpiryChange && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Date d'expiration</label>
          <Input
            type="date"
            value={expiresAt ?? ""}
            onChange={(e) => onExpiryChange(e.target.value || null)}
            className="h-8 w-auto text-xs"
          />
        </div>
      )}
    </div>
  );
}
