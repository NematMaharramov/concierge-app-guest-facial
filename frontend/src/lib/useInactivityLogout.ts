import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Automatically logs out the user after INACTIVITY_TIMEOUT_MS of no
 * mouse/keyboard/touch activity.  Call this once inside a layout component
 * that wraps authenticated pages (e.g. dashboard/layout.tsx).
 *
 * @param onLogout  The logout function from useAuth()
 * @param enabled   Pass false to disable (e.g. when user is not logged in)
 */
export function useInactivityLogout(onLogout: () => void, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [onLogout]);

  useEffect(() => {
    if (!enabled) return;

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ] as const;

    // Start the timer immediately
    reset();

    // Reset on every user interaction
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, reset]);
}
