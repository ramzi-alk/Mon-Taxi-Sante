export function SkeletonRideCard() {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 animate-pulse overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="h-4 w-36 bg-gray-200 rounded" />
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="h-4 w-4 bg-gray-200 rounded shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-200 rounded" />
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="h-4 w-4 bg-gray-200 rounded shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
        </div>
        <div className="h-11 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonRideRow() {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 animate-pulse overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <div className="h-3.5 w-32 bg-gray-200 rounded" />
        <div className="h-6 w-16 bg-gray-200 rounded-lg" />
      </div>
      <div className="px-3 pt-2 pb-1 space-y-1.5">
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
        <div className="flex gap-1">
          <div className="h-4 w-10 bg-gray-200 rounded-full" />
          <div className="h-4 w-8 bg-gray-200 rounded-full" />
        </div>
        <div className="h-4 w-14 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
