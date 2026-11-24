import { useEffect, useMemo, useState } from "react";
import { loadTokenizer, plainTokens, type Token, type Tokenize } from "./highlight";

/** Tokens for `code`: plain text first, then Shiki's once it has loaded. Stays plain if loading fails. */
export function useTokens(code: string): Token[][] {
  const [tokenize, setTokenize] = useState<Tokenize | null>(null);
  useEffect(() => {
    let live = true;
    loadTokenizer().then(
      (t) => live && setTokenize(() => t),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  return useMemo(() => (tokenize ? tokenize(code) : plainTokens(code)), [tokenize, code]);
}
