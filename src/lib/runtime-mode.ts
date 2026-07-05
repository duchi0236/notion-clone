/**
 * Runtime mode flags.
 *
 * LOCAL_MODE: allows anonymous access with a shared demo workspace (local-first
 * personal deployment / development). In production builds it must be enabled
 * explicitly via CLAWNOTE_LOCAL_MODE=1 — otherwise every API request requires a
 * valid NextAuth session (enforced centrally in src/middleware.ts and again in
 * ensureWorkspace / permissions as defense in depth).
 */
export const LOCAL_MODE =
  process.env.CLAWNOTE_LOCAL_MODE === "1" || process.env.NODE_ENV !== "production";
