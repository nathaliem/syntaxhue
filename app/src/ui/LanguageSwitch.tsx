import { loadTokenizer, type Lang } from "../preview/highlight";
import { SAMPLES } from "../preview/samples";

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

/** Picks which language the preview shows. Hovering or focusing a button starts fetching that grammar. */
export function LanguageSwitch({ lang, onChange }: Props) {
  const warm = (l: Lang) => void loadTokenizer(l).catch(() => {});
  return (
    <div className="lang-switch" role="group" aria-label="Preview language">
      {SAMPLES.map((s) => (
        <button
          key={s.lang}
          aria-pressed={s.lang === lang}
          aria-label={s.name}
          title={s.name}
          onClick={() => onChange(s.lang)}
          onPointerEnter={() => warm(s.lang)}
          onFocus={() => warm(s.lang)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
