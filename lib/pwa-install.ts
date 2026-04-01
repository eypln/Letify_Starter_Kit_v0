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
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
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
