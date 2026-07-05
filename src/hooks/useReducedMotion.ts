"use client";
import { useEffect, useState } from "react";

/**
 * Tracks the OS "reduce motion" preference. Use this to gate JS-driven motion
 * that CSS can't reach — the MacDock rAF magnification, the typewriter effect,
 * programmatic smooth scrolling. Declarative CSS animations are already
 * neutralised globally by the @media (prefers-reduced-motion) block in globals.css.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Imperative one-shot read for non-React code paths (event handlers, rAF loops). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
