import { useEffect, useMemo, useState } from "react";
import { loadTokenizer, plainTokens, type Lang, type Token, type Tokenize } from "./highlight";

/**
 * Tokens for `code` in `lang`. Until the grammar has loaded the lines are plain text and `loading` is true
 * (the preview shows a skeleton). If loading fails the code stays plain and `loading` goes false.
 */
export function useTokens(code: string, lang: Lang): { lines: Token[][]; loading: boolean } {
  const [loaded, setLoaded] = useState<{ lang: Lang; tokenize: Tokenize } | null>(null);
  const [failed, setFailed] = useState<Lang | null>(null);
  useEffect(() => {
    let live = true;
    loadTokenizer(lang).then(
      (tokenize) => live && setLoaded({ lang, tokenize }),
      () => live && setFailed(lang),
    );
    return () => {
      live = false;
    };
  }, [lang]);
  const ready = loaded?.lang === lang ? loaded.tokenize : null;
  const lines = useMemo(() => (ready ? ready(code) : plainTokens(code)), [ready, code]);
  return { lines, loading: !ready && failed !== lang };
}
