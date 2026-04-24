import { useEffect } from 'react';

/**
 * FIX 6: Locks document body scroll while a modal is open.
 * Without this, users can scroll the page content behind the modal overlay
 * which looks broken on mobile and is distracting on desktop.
 *
 * Usage: call useModalScrollLock(isOpen) in any component that renders a modal.
 * Pass true when the modal is visible, false when it is closed.
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    // Save current scroll position and overflow style
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    // Lock scroll — using position:fixed maintains the scroll position visually
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // Restore everything and jump back to saved scroll position
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
