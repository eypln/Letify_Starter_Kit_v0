"use client"

import * as React from "react"
import { useToast } from "./use-toast"

export default function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-0 right-0 p-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg border max-w-sm ${
            toast.variant === "destructive"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="font-medium">{toast.title}</div>
          {toast.description && (
            <div className="text-sm opacity-90">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  )
}