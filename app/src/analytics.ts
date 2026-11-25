import { track } from "@vercel/analytics";

/**
 * Every analytics event the app may send. Anything not listed here is dropped by `trackEvent`, and a test fails if
 * this list and the code drift apart. Events never carry colors, theme names, links or any text a person typed.
 * `props` lists the only properties an event may have, each with the values allowed.
 */
export const EVENT_DICTIONARY = {
  shuffle: { when: "A shuffle is run (the first one in a visit only).", once: true, props: {} },
  edit: {
    when: "A color, slider or font style is changed by hand (the first one in a visit only).",
    once: true,
    props: {},
  },
  export: {
    when: "A settings snippet, theme file, extension or editor/terminal file is copied or downloaded.",
    props: { type: ["settings", "file", "extension", "editor", "terminal"] },
  },
  survey: {
    when: "The one-question exit survey after the first export is answered.",
    props: { answer: ["easy", "help", "failed"] },
  },
  share: { when: "A share link is copied.", props: {} },
  library_save: { when: "A theme is saved to the library.", props: {} },
} as const satisfies Record<string, { when: string; once?: boolean; props: Record<string, readonly string[]> }>;

/** Events marked `once` that were already sent in this visit. */
const sentOnce = new Set<string>();
/** For tests: forget which `once` events were sent. */
export const resetOnce = () => sentOnce.clear();

export type EventName = keyof typeof EVENT_DICTIONARY;

/** True when the browser asks not to be tracked. Nothing is sent then, not even page views. */
export function doNotTrack(nav: Pick<Navigator, "doNotTrack"> = navigator): boolean {
  return nav.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1";
}

/** Sends a listed event with only its allowed properties. Returns whether anything was sent. */
export function trackEvent(name: EventName, props: Record<string, string> = {}): boolean {
  const entry = (EVENT_DICTIONARY as Record<string, { once?: boolean; props: Record<string, readonly string[]> }>)[
    name
  ];
  if (!entry || doNotTrack()) return false;
  if (entry.once) {
    if (sentOnce.has(name)) return false;
    sentOnce.add(name);
  }
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(props)) {
    if (entry.props[k]?.includes(v)) clean[k] = v;
  }
  track(name, clean);
  return true;
}

/** For `<Analytics beforeSend>`: drops every page view and event when Do Not Track is on, and strips the URL fragment. */
export function beforeSend<E extends { url: string }>(event: E): E | null {
  if (doNotTrack()) return null;
  // A share link keeps the whole theme after the "#"; it must never reach analytics.
  return { ...event, url: event.url.split("#")[0] };
}
