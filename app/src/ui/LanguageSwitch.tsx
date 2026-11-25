import { loadTokenizer, type Lang } from "../preview/highlight";
import { SAMPLES } from "../preview/samples";
import { SegmentedControl } from "./kit";

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

/** Picks which language the preview shows. Hovering or focusing a button starts fetching that grammar. */
export function LanguageSwitch({ lang, onChange }: Props) {
  const warm = (l: Lang) => void loadTokenizer(l).catch(() => {});
  return (
    <SegmentedControl
      className="lang-switch"
      label="Preview language"
      value={lang}
      onChange={onChange}
      segments={SAMPLES.map((s) => ({
        value: s.lang,
        label: s.label,
        ariaLabel: s.name,
        buttonProps: { title: s.name, onPointerEnter: () => warm(s.lang), onFocus: () => warm(s.lang) },
      }))}
    />
  );
}
