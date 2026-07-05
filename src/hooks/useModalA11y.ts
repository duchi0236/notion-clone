"use client";
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Stack of currently-open modals (innermost last). Only the topmost modal
// responds to Esc / Tab, so a confirm() opened from inside another modal
// closes itself first without also closing its parent. Listeners on `document`
// fire in registration order regardless of phase, so a stack — not
// stopImmediatePropagation — is what gets the ordering right.
const modalStack: symbol[] = [];

/**
 * Accessibility plumbing for modals and drawers. Attach the returned ref to the
 * dialog/drawer container. While `open`:
 *  - moves focus into the container on open (initialFocus, else first focusable, else container)
 *  - traps Tab / Shift+Tab inside the container (topmost modal only)
 *  - closes on Escape (topmost modal only)
 *  - restores focus to the element that was focused before opening
 *  - optionally locks body scroll (default true; pass false for non-blocking drawers)
 *
 * Give the container role="dialog" aria-modal="true" and an aria-label yourself.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(opts: {
  open: boolean;
  onClose: () => void;
  initialFocus?: RefObject<HTMLElement | null>;
  lockScroll?: boolean;
}): RefObject<T> {
  const { open, onClose, initialFocus, lockScroll = true } = opts;
  const containerRef = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const idRef = useRef<symbol>(Symbol("modal"));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    modalStack.push(id);
    restoreRef.current = (document.activeElement as HTMLElement) ?? null;

    const isTop = () => modalStack[modalStack.length - 1] === id;

    // Move focus in. Try immediately (element is already committed) and again on
    // the next frame — the double attempt survives React StrictMode's mount /
    // remount in dev, where a single rAF can target a torn-down node.
    const focusInitial = () => {
      const el =
        initialFocus?.current ??
        containerRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        containerRef.current;
      el?.focus();
    };
    focusInitial();
    const raf = requestAnimationFrame(focusInitial);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return; // only the topmost modal handles keys
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    const prevOverflow = lockScroll ? document.body.style.overflow : "";
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      const i = modalStack.lastIndexOf(id);
      if (i !== -1) modalStack.splice(i, 1);
      if (lockScroll && modalStack.length === 0) document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, initialFocus, lockScroll]);

  return containerRef;
}
