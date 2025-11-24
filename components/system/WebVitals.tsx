'use client'

import { useReportWebVitals } from 'next/web-vitals'

/**
 * Web Vitals Reporter Component
 * 
 * Monitors and logs Core Web Vitals:
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Web Vitals:', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
      })
    }

    // Send to analytics service (Google Analytics, Vercel Analytics, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Google Analytics
      interface WindowWithGtag extends Window {
        gtag?: (event: string, name: string, params: Record<string, unknown>) => void;
      }
      if (typeof window !== 'undefined' && (window as WindowWithGtag).gtag) {
        (window as WindowWithGtag).gtag?.('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_category: 'Web Vitals',
          event_label: metric.id,
          non_interaction: true,
        })
      }

      // Example: Send to custom analytics endpoint
      // fetch('/api/analytics/vitals', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric),
      // })
    }

    // Performance thresholds
    const thresholds = {
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FID: { good: 100, needsImprovement: 300 },
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      TTFB: { good: 800, needsImprovement: 1800 },
      INP: { good: 200, needsImprovement: 500 },
    }

    // Warn if metrics exceed thresholds
    const threshold = thresholds[metric.name as keyof typeof thresholds]
    if (threshold) {
      if (metric.value > threshold.needsImprovement) {
        console.warn(
          `⚠️ ${metric.name} needs improvement:`,
          `${metric.value} (threshold: ${threshold.needsImprovement})`
        )
      } else if (metric.value > threshold.good) {
        console.info(
          `ℹ️ ${metric.name} could be better:`,
          `${metric.value} (good: ${threshold.good})`
        )
      }
    }
  })

  return null
}

/**
 * Performance monitoring utility functions
 */
export const PerformanceUtils = {
  /**
   * Mark a custom performance measurement
   */
  mark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(name)
    }
  },

  /**
   * Measure time between two marks
   */
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.measure(name, startMark, endMark)
        const measure = performance.getEntriesByName(name)[0]
        console.log(`⏱️ ${name}: ${Math.round(measure.duration)}ms`)
        return measure.duration
      } catch (e) {
        console.warn('Performance measurement failed:', e)
      }
    }
    return 0
  },

  /**
   * Get navigation timing metrics
   */
  getNavigationTiming: () => {
    if (typeof window === 'undefined' || !window.performance) return null

    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!timing) return null

    return {
      dns: Math.round(timing.domainLookupEnd - timing.domainLookupStart),
      tcp: Math.round(timing.connectEnd - timing.connectStart),
      ttfb: Math.round(timing.responseStart - timing.requestStart),
      download: Math.round(timing.responseEnd - timing.responseStart),
      domInteractive: Math.round(timing.domInteractive - timing.fetchStart),
      domComplete: Math.round(timing.domComplete - timing.fetchStart),
      loadComplete: Math.round(timing.loadEventEnd - timing.fetchStart),
    }
  },

  /**
   * Log current performance metrics
   */
  logMetrics: () => {
    const timing = PerformanceUtils.getNavigationTiming()
    if (timing) {
      console.log('📊 Navigation Timing:', timing)
    }

    if (typeof window !== 'undefined' && window.performance) {
      const resources = performance.getEntriesByType('resource')
      console.log('📦 Resource Count:', resources.length)
      
      const largeResources = resources
        .filter((r) => {
          const resource = r as PerformanceResourceTiming;
          return resource.transferSize > 100000;
        })
        .sort((a, b) => {
          const resA = a as PerformanceResourceTiming;
          const resB = b as PerformanceResourceTiming;
          return resB.transferSize - resA.transferSize;
        })
        .slice(0, 10)
      
      if (largeResources.length > 0) {
        console.log('🔍 Largest Resources (>100KB):', largeResources.map((r) => {
          const resource = r as PerformanceResourceTiming;
          return {
            name: resource.name.split('/').pop(),
            size: Math.round(resource.transferSize / 1024) + 'KB',
            duration: Math.round(resource.duration) + 'ms',
          };
        }))
      }
    }
  },
}
