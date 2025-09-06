"use client";
import { useEffect, type ReactNode } from "react";

export default function ErrorShield({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const src = e.filename || '';
      if (src.startsWith('chrome-extension://')) {
        // MetaMask vb. extension hatalarını dev overlay'e taşımayı engelle
        e.stopImmediatePropagation();
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: any = e.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || '';
      const stack = reason?.stack || '';
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
