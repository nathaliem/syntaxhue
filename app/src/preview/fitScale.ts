/** The preview is laid out at this width. Narrower spaces scale it down instead of cropping it. */
export const LOGICAL_WIDTH = 1100;

/** How much to shrink content of `LOGICAL_WIDTH` to fit `available` pixels. Never enlarges. */
export function fitScale(available: number): number {
  if (!Number.isFinite(available) || available <= 0) return 1;
  return Math.min(1, available / LOGICAL_WIDTH);
}
