import { shuffleLabel } from "../engine/theme";
import { Button } from "./kit";

interface Props {
  unlocked: number;
  onShuffle: () => void;
  onExport: () => void;
}

/** Phones: the two actions that matter, within reach of a thumb. */
export function ThumbBar({ unlocked, onShuffle, onExport }: Props) {
  return (
    <div className="thumb-bar">
      <Button variant="primary" onClick={onShuffle} disabled={unlocked === 0}>
        {shuffleLabel(unlocked)}
      </Button>
      <Button onClick={onExport}>Export</Button>
    </div>
  );
}
