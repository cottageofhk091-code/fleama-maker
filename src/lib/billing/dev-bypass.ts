import { getDevPersona } from "./dev-persona";

/**
 * Local-only Sold Pro bypass for note screenshots / UI demos.
 *
 * Hard rules:
 * - Never active when NODE_ENV !== "development" (Vercel production builds included)
 * - Requires ALLOW_DEV_BYPASS_PRO === "true"
 * - Dev persona override wins: free / unauthenticated → bypass OFF; paid → ON
 */
export function isDevProBypassEnabled(): boolean {
  // Absolute production gate — do not reorder or weaken
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const persona = getDevPersona();
  if (persona === "unauthenticated" || persona === "free") {
    return false;
  }
  if (persona === "paid") {
    return true;
  }

  return process.env.ALLOW_DEV_BYPASS_PRO === "true";
}
