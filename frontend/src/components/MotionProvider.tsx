"use client";

import { MotionConfig } from "framer-motion";

/**
 * Single source of truth for reduced-motion across the site: every
 * framer-motion animation, wherever it's added, is disabled automatically
 * when the visitor has "reduce motion" set. Don't re-check the media query
 * per-component — wrap this once at the root instead.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
