import { Dialog, IconButton } from "./kit";
import { CloseIcon } from "./icons";
import { FEEDBACK_URL } from "../feedback";

/** What SyntaxHue is, how export works, what is collected, and that it isn't a Microsoft product. */
export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} titleId="about-title" className="about">
      <div className="export-in">
        <div className="export-h">
          <h2 id="about-title">About and privacy</h2>
          <IconButton size="sm" label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="about-body">
          <h3>What it is</h3>
          <p>
            SyntaxHue makes color themes for VS Code. Shuffle, tune what you like, then paste the result into your
            settings or export it as an extension. It is free and made by one person.
          </p>
          <h3>Your themes stay with you</h3>
          <p>
            Everything happens in your browser. Themes are never uploaded. Your current theme and your library are
            stored in this browser only, and a share link holds the whole theme inside the link itself.
          </p>
          <h3>What is collected</h3>
          <p>
            Anonymous counts from Vercel Web Analytics: page views (the country and the kind of browser) and a few
            button presses: a first shuffle and a first hand edit per visit, and each export (only its kind: settings,
            theme file, extension, editor or terminal), share link copy, library save, and your one tap on the “How did
            exporting go?” question (one of three fixed answers, asked once). No cookies, no IP addresses stored, no
            accounts, and never your colors, theme names or the text of a share link. If your browser sends Do Not
            Track, nothing is sent at all.
          </p>
          {FEEDBACK_URL && (
            <>
              <h3>Feedback</h3>
              <p>
                Something confusing or broken?{" "}
                <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">
                  Send feedback
                </a>
                . It goes to one person who reads everything.
              </p>
            </>
          )}
          <h3>Not affiliated with Microsoft</h3>
          <p>
            SyntaxHue is an independent project. Visual Studio Code is a trademark of Microsoft Corporation, and this
            site is not affiliated with or endorsed by Microsoft.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
