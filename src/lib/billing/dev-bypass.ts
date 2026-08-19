/**
 * Local-only Sold Pro bypass for note screenshots / UI demos.
 *
 * Hard rules:
 * - Never active when NODE_ENV !== "development" (Vercel production builds included)
 * - Requires ALLOW_DEV_BYPASS_PRO === "true"
 */
export function isDevProBypassEnabled(): boolean {
  // Absolute production gate — do not reorder or weaken
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  return process.env.ALLOW_DEV_BYPASS_PRO === "true";
}
