/**
 * Loading skeletons for better perceived performance
 */

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-12 bg-gray-200 rounded animate-pulse flex-1" />
          <div className="h-12 bg-gray-200 rounded animate-pulse w-32" />
          <div className="h-12 bg-gray-200 rounded animate-pulse w-24" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4 mb-4" />
      <div className="h-64 bg-gray-100 rounded animate-pulse" />
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-28 mb-2" />
        <div className="h-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse w-24" />
        <div className="h-10 bg-gray-200 rounded animate-pulse w-24" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ items = 10 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export function ButtonLoader() {
  return (
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
  )
}
