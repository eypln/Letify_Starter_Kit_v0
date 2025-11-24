"use client";
import { useEffect, type ReactNode } from "react";

export default function ErrorShield({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // ErrorEvent doesn't have createFilename, only filename
      const src = (e as ErrorEvent & { filename?: string }).filename || e.message || '';
      if (src.startsWith('chrome-extension://')) {
        // MetaMask vb. extension hatalarını dev overlay'e taşımayı engelle
        e.stopImmediatePropagation();
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason;
      const msg = typeof reason === 'string' ? reason : (reason as Error)?.message || '';
      const stack = (reason as Error)?.stack || '';
      if (msg.includes('MetaMask') || stack.includes('chrome-extension://')) {
        e.preventDefault(); // dev overlay'e düşmesin
      }
    };
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
    };
  }, []);
  return <>{children}</>;
}
