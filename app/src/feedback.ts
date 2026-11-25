/** Where "Send feedback" goes. Set `VITE_FEEDBACK_URL` at build time (a form, an issue tracker or a mailto: link); with none set, no link is shown. */
export const FEEDBACK_URL: string = import.meta.env.VITE_FEEDBACK_URL ?? "";
