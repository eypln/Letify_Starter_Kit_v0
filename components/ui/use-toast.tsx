"use client"

import * as React from "react"

type ToastProps = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

type ToasterToast = ToastProps & {
  id: string
}

const toastContext = React.createContext<{
  toast: (props: ToastProps) => void
  toasts: ToasterToast[]
} | undefined>(undefined)

export function useToast() {
  const context = React.useContext(toastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  const toast = React.useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 15)
    const newToast = { ...props, id }
    
    setToasts((prev) => [...prev, newToast])
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <toastContext.Provider value={{ toast, toasts }}>
      {children}
    </toastContext.Provider>
  )
}