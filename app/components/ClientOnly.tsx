'use client';
import { useSyncExternalStore, PropsWithChildren } from 'react';

const subscribe = () => () => {};

export default function ClientOnly({ children }: PropsWithChildren) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  
  if (!mounted) return null;
  return <>{children}</>;
}
