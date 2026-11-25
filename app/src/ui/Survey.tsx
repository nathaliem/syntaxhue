import { useState } from "react";
import { trackEvent } from "../analytics";
import { FEEDBACK_URL } from "../feedback";
import { Button } from "./kit";

const KEY = "hueprint:survey";

function answered(): boolean {
  try {
    return localStorage.getItem(KEY) === "done";
  } catch {
    return false;
  }
}

/** One question, asked once ever, right after the first export. The answer is one of three fixed choices, counted anonymously. */
export function Survey() {
  const [gone, setGone] = useState(answered);
  if (gone) return null;
  const close = (answer?: "easy" | "help" | "failed") => {
    if (answer) trackEvent("survey", { answer });
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      /* storage blocked: asked again next visit */
    }
    setGone(true);
  };
  return (
    <section className="survey" aria-label="Quick question">
      <p>
        <b>How did exporting go?</b> One tap, nothing else is sent.
      </p>
      <div className="survey-row">
        <Button size="sm" onClick={() => close("easy")}>
          Worked first try
        </Button>
        <Button size="sm" onClick={() => close("help")}>
          Needed some help
        </Button>
        <Button size="sm" onClick={() => close("failed")}>
          Didn’t work
        </Button>
        <button type="button" className="link-btn" onClick={() => close()}>
          No thanks
        </button>
      </div>
      {FEEDBACK_URL && (
        <p className="survey-more">
          Want to say more?{" "}
          <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">
            Send feedback
          </a>
        </p>
      )}
    </section>
  );
}
