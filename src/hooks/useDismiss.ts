"use client";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Lightweight dismiss behavior for popovers / dropdowns / menus (no focus trap,
 * no scroll lock). While `open`, closes on Escape and on pointer-down outside
 * every ref in `refs` (pass the panel ref AND the trigger ref so clicking the
 * trigger toggles cleanly instead of double-firing). Uses mousedown (not click)
 * so a drag that starts inside doesn't accidentally dismiss.
 */
export function useDismiss(opts: {
  open: boolean;
  onClose: () => void;
  refs: Array<RefObject<HTMLElement | null>>;
}) {
  const { open, onClose, refs } = opts;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (t instanceof Element && t.closest("[data-claw-floating-layer]")) return;
      if (refsRef.current.some((r) => r.current?.contains(t))) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const active = document.activeElement;
        if (active instanceof Element && active.closest("[data-claw-floating-layer]")) return;
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
}
