'use client'

/**
 * Global PWA install prompt capture.
 * Captures beforeinstallprompt as early as possible (in layout)
 * so it's not missed by individual components.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  // Pick up event captured by the early inline head script (fires before React bundles load)
  const earlyPrompt = (window as unknown as Record<string, unknown>).__pwaInstallPrompt
  if (earlyPrompt) {
    deferredPrompt = earlyPrompt as BeforeInstallPromptEvent
    ;(window as unknown as Record<string, unknown>).__pwaInstallPrompt = null
    console.log('🎉 PWA Global: beforeinstallprompt recovered from early capture')
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    ;(window as unknown as Record<string, unknown>).__pwaInstallPrompt = null
    console.log('🎉 PWA Global: beforeinstallprompt captured')
    listeners.forEach(fn => fn())
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    console.log('✅ PWA Global: App installed')
    listeners.forEach(fn => fn())
  })
}

export function getDeferredPrompt() {
  return deferredPrompt
}

export function clearDeferredPrompt() {
  deferredPrompt = null
  listeners.forEach(fn => fn())
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function getSnapshot() {
  return deferredPrompt
}

export function getServerSnapshot() {
  return null
}
