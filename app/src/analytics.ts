import { track } from "@vercel/analytics";

/**
 * Every analytics event the app may send. Anything not listed here is dropped by `trackEvent`, and a test fails if
 * this list and the code drift apart. Events never carry colors, theme names, links or any text a person typed.
 * `props` lists the only properties an event may have, each with the values allowed.
 */
export const EVENT_DICTIONARY = {
  shuffle: { when: "A shuffle is run.", props: {} },
  export: {
    when: "An export is copied or downloaded.",
    props: { type: ["settings", "file", "extension", "editor", "terminal", "link"] },
  },
  share: { when: "A share link is copied.", props: {} },
  library_save: { when: "A theme is saved to the library.", props: {} },
} as const satisfies Record<string, { when: string; props: Record<string, readonly string[]> }>;

export type EventName = keyof typeof EVENT_DICTIONARY;

/** True when the browser asks not to be tracked. Nothing is sent then, not even page views. */
export function doNotTrack(nav: Pick<Navigator, "doNotTrack"> = navigator): boolean {
  return nav.doNotTrack === "1" || (window as { doNotTrack?: string }).doNotTrack === "1";
}

/** Sends a listed event with only its allowed properties. Returns whether anything was sent. */
export function trackEvent(name: EventName, props: Record<string, string> = {}): boolean {
  const entry = (EVENT_DICTIONARY as Record<string, { props: Record<string, readonly string[]> }>)[name];
  if (!entry || doNotTrack()) return false;
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
