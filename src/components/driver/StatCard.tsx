export function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:gap-4 sm:rounded-2xl sm:p-5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${color}`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-gray-900 leading-tight sm:text-2xl">{value}</p>
        <p className="text-xs leading-snug text-muted-foreground sm:text-sm">{label}</p>
      </div>
    </div>
  );
}
