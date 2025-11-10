/**
 * Performance Optimization Utilities
 * 
 * Helper functions for improving application performance
 */

/**
 * Debounce function to limit how often a function is called
 * Useful for search inputs, resize events, etc.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to ensure a function is called at most once in a specified period
 * Useful for scroll events, mouse movements, etc.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Lazy load images when they enter viewport
 */
export function setupIntersectionObserver(
  elements: Element[],
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry)
      }
    })
  }, options || { rootMargin: '50px' })

  elements.forEach((el) => observer.observe(el))

  return observer
}

/**
 * Memoize expensive function results
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Check if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get network information
 */
export function getNetworkInfo() {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return null
  }

  const connection = (navigator as any).connection
  return {
    effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
    downlink: connection.downlink, // Mbps
    rtt: connection.rtt, // Round-trip time in ms
    saveData: connection.saveData, // Data saver mode
  }
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const connection = getNetworkInfo()
  const memory = (navigator as any).deviceMemory // GB

  return (
    (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') ||
    (memory && memory < 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
  )
}

/**
 * Optimize image loading based on device capabilities
 */
export function getOptimalImageQuality(): 'low' | 'medium' | 'high' {
  if (isLowEndDevice()) return 'low'
  
  const connection = getNetworkInfo()
  if (connection?.effectiveType === '4g') return 'high'
  if (connection?.effectiveType === '3g') return 'medium'
  
  return 'medium'
}

/**
 * Defer non-critical resources
 */
export function deferResource(fn: () => void, priority: 'high' | 'low' = 'low') {
  if (typeof window === 'undefined') return

  if (priority === 'high') {
    // Use requestIdleCallback for low-priority tasks
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(fn)
    } else {
      setTimeout(fn, 1)
    }
  } else {
    // Defer until after initial render
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        requestAnimationFrame(fn)
      })
    } else {
      setTimeout(fn, 100)
    }
  }
}

/**
 * Batch DOM updates
 */
export function batchUpdates(updates: (() => void)[]): void {
  if (typeof requestAnimationFrame === 'undefined') {
    updates.forEach(update => update())
    return
  }

  requestAnimationFrame(() => {
    updates.forEach(update => update())
  })
}

/**
 * Measure component render time
 */
export function measureRender(
  componentName: string,
  callback: () => void
): void {
  if (typeof performance === 'undefined') {
    callback()
    return
  }

  const start = performance.now()
  callback()
  const end = performance.now()
  
  const duration = end - start
  if (duration > 16) { // Slower than 60fps
    console.warn(
      `⚠️ Slow render detected: ${componentName} took ${Math.round(duration)}ms`
    )
  }
}
