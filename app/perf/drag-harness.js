/**
 * Drag benchmark for HP-407. Paste into the browser console (or run through a browser tool) on a page
 * that shows the app, ideally the production build (`npm run build && npm run preview`).
 *
 *   await syntaxhueDrag({ role: "Keyword", slider: "Lightness", steps: 120, slowdown: 4 })
 *   await syntaxhueDrag({ vibe: "Saturation", steps: 120, slowdown: 4 })
 *
 * Each step sets the slider like a pointer drag would (an `input` event), lets React render, forces
 * layout, and waits for the next paint. `slowdown` imitates Chrome's CPU throttling by keeping the
 * main thread busy for (slowdown - 1) times as long as the work took, so 4 ~ "4x slowdown".
 * Reports frame times in ms: work (script + layout), the split of that work into React (render + commit)
 * and style/layout, and total (until the frame is painted). Needs the Browser pane to be visible,
 * otherwise animation frames are throttled and the totals mean nothing.
 */
window.syntaxhueDrag = async function syntaxhueDrag({ role, slider, vibe, steps = 120, slowdown = 1 } = {}) {
  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const setValue = (input, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, String(v));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  let input;
  if (vibe) {
    if (!document.querySelector(".vibe-pop"))
      [...document.querySelectorAll("button")].find((b) => /^Vibe/.test(b.textContent)).click();
    await nextPaint();
    input = document.getElementById(`vibe-${vibe.toLowerCase()}`);
  } else {
    const row = [...document.querySelectorAll(".role-main")].find((b) => b.textContent.startsWith(role));
    if (row.getAttribute("aria-expanded") !== "true") row.click();
    await nextPaint();
    const label = [...document.querySelectorAll(".editor .slider-l")].find((l) => l.textContent === slider);
    input = label.parentElement.querySelector("input");
  }
  const min = Number(input.min);
  const max = Number(input.max);
  const start = Number(input.value);

  const work = [];
  const total = [];
  const reactTime = [];
  const layoutTime = [];
  for (let i = 0; i < steps; i++) {
    // sweep back and forth across 60 % of the range so every step changes the value
    const t = (i % 40) / 40;
    const v = min + (max - min) * (0.2 + 0.6 * (t < 0.5 ? t * 2 : 2 - t * 2));
    const t0 = performance.now();
    setValue(input, v);
    const t1 = performance.now();
    void document.body.offsetHeight; // force style recalculation and layout
    const t2 = performance.now();
    reactTime.push(t1 - t0);
    layoutTime.push(t2 - t1);
    const w = t2 - t0;
    if (slowdown > 1) {
      const until = performance.now() + w * (slowdown - 1);
      while (performance.now() < until);
    }
    work.push(w * slowdown);
    await nextPaint();
    total.push(performance.now() - t0);
  }
  setValue(input, start);
  const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
  const r = (n) => Math.round(n * 10) / 10;
  return {
    steps,
    slowdown,
    workMs: { median: r(pct(work, 0.5)), p95: r(pct(work, 0.95)), max: r(Math.max(...work)) },
    frameMs: { median: r(pct(total, 0.5)), p95: r(pct(total, 0.95)), max: r(Math.max(...total)) },
    reactMs: { median: r(pct(reactTime, 0.5)), p95: r(pct(reactTime, 0.95)) },
    styleLayoutMs: { median: r(pct(layoutTime, 0.5)), p95: r(pct(layoutTime, 0.95)) },
  };
};
