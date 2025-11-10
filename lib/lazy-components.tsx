// Lazy-loaded component wrappers for performance optimization

import dynamic from 'next/dynamic'

/**
 * React Select - Heavy component, lazy load for better performance
 * Used in: Clients, Viewings, Revenue, Listings pages
 */
export const LazySelect = dynamic(() => import('react-select'), {
  ssr: false,
  loading: () => <div className="h-10 bg-gray-100 animate-pulse rounded" />,
})

/**
 * React DatePicker - Heavy component with date-fns dependency
 * Used in: Clients, Viewings, Revenue pages
 */
export const LazyDatePicker = dynamic(
  // @ts-ignore - Type incompatibility with react-datepicker defaultProps
  () => import('react-datepicker'),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-gray-100 animate-pulse rounded" />,
  }
)

/**
 * Recharts components - Heavy charting library
 * Used in: Analytics page
 */
export const LazyBarChart = dynamic(() => import('@/components/ui/bar-chart'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
})

export const LazyLineChart = dynamic(() => import('@/components/ui/line-chart'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
})

export const LazyPieChart = dynamic(() => import('@/components/ui/pie-chart'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
})

export const LazyGroupedBarChart = dynamic(() => import('@/components/ui/grouped-bar-chart'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
})

export const LazyHistogramBarChart = dynamic(() => import('@/components/ui/histogram-bar-chart'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />,
})

/**
 * Dialog components - Can be lazy loaded since they're modal overlays
 */
export const LazyDialog = dynamic(() => 
  import('@/components/ui/dialog').then(mod => ({
    default: mod.Dialog,
  })), {
  ssr: false,
})

/**
 * Image upload components - Heavy with compression logic
 */
export const LazyUploader = dynamic(() => import('@/components/upload/uploader'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded" />,
})
