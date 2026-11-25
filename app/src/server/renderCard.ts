import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ThemeState } from "../engine/theme";
import { CARD_SIZE, previewCard, type CardNode } from "./previewCard";

export interface CardFont {
  name: string;
  data: ArrayBuffer | Buffer;
  weight: 400 | 700;
  style: "normal" | "italic";
}

/** Draws the shared-theme card and returns it as PNG bytes. */
export async function renderCard(theme: ThemeState, fonts: CardFont[]): Promise<Uint8Array> {
  // Satori reads a plain element tree; its own type wants React elements, which this server code doesn't use.
  const svg = await satori(previewCard(theme) as CardNode as never, { ...CARD_SIZE, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: CARD_SIZE.width } }).render().asPng();
}
