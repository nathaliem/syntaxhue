/** "just now", "5 min ago", "2 h ago", "3 d ago". */
export function ago(then: number, now = Date.now()): string {
  const min = Math.floor((now - then) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} h ago`;
  return `${Math.floor(min / 60 / 24)} d ago`;
}
