/** The project on GitHub. */
export const GITHUB_URL = "https://github.com/nathaliem/syntaxhue";

/**
 * Where "Send feedback" goes: the GitHub issues page, unless `VITE_FEEDBACK_URL` sets another place (a form or a
 * mailto: link) at build time.
 */
export const FEEDBACK_URL: string = import.meta.env.VITE_FEEDBACK_URL || `${GITHUB_URL}/issues/new`;
