'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Registered from the root layout so it covers the whole app (guest
    // site and staff dashboard alike) — installability applies to both.
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: the app still works perfectly without an installed PWA.
    });
  }, []);

  return null;
}
