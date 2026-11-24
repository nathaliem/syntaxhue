export type Snap = "half" | "full";

/** Drag distance (px) that counts as a deliberate swipe rather than a tap. */
const SWIPE = 60;

/** Where a release lands: swipe up opens fully, swipe down shrinks, or closes from the small size. */
export function settle(snap: Snap, dy: number): Snap | "close" {
  if (dy <= -SWIPE) return "full";
  if (dy >= SWIPE) return snap === "full" ? "half" : "close";
  return snap;
}
