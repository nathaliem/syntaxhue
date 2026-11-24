import { crc32 } from "./zip";

/**
 * A minimal PNG writer: 8-bit RGBA, no filtering, and zlib "stored" blocks instead of compression. That makes
 * the file larger than a browser would write (fine for a 128 px icon, about 66 KB) but needs no canvas, so the
 * icon can be built, tested and made byte-for-byte reproducible anywhere.
 */

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const v of bytes) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error("Pixel data does not match the image size");
  const stride = width * 4 + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * stride + 1);

  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const z = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  z[0] = 0x78;
  z[1] = 0x01;
  let at = 2;
  for (let i = 0; i < blocks; i++) {
    const part = raw.subarray(i * 65535, (i + 1) * 65535);
    z[at++] = i === blocks - 1 ? 1 : 0; // final-block flag, stored
    z[at++] = part.length & 255;
    z[at++] = part.length >> 8;
    z[at++] = ~part.length & 255;
    z[at++] = (~part.length >> 8) & 255;
    z.set(part, at);
    at += part.length;
  }
  new DataView(z.buffer).setUint32(at, adler32(raw));

  const ihdr = new Uint8Array(13);
  const h = new DataView(ihdr.buffer);
  h.setUint32(0, width);
  h.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  const parts = [new Uint8Array(SIGNATURE), chunk("IHDR", ihdr), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Reads back a PNG made by `encodePng` (checksums verified). For tests and sanity checks. */
export function decodePng(png: Uint8Array): { width: number; height: number; rgba: Uint8Array } {
  if (SIGNATURE.some((b, i) => png[i] !== b)) throw new Error("Not a PNG");
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];
  while (at < png.length) {
    const len = v.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const data = png.subarray(at + 8, at + 8 + len);
    if (v.getUint32(at + 8 + len) !== crc32(png.subarray(at + 4, at + 8 + len)))
      throw new Error(`Bad checksum in ${type}`);
    if (type === "IHDR") {
      width = v.getUint32(at + 8);
      height = v.getUint32(at + 12);
    } else if (type === "IDAT") idat.push(data);
    at += 12 + len;
  }
  const z = new Uint8Array(idat.reduce((n, p) => n + p.length, 0));
  let zo = 0;
  for (const p of idat) {
    z.set(p, zo);
    zo += p.length;
  }
  const raw: number[] = [];
  let i = 2;
  for (;;) {
    const final = z[i] & 1;
    const len = z[i + 1] | (z[i + 2] << 8);
    for (let k = 0; k < len; k++) raw.push(z[i + 5 + k]);
    i += 5 + len;
    if (final) break;
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    if (raw[y * (width * 4 + 1)] !== 0) throw new Error("Unsupported filter");
    for (let x = 0; x < width * 4; x++) rgba[y * width * 4 + x] = raw[y * (width * 4 + 1) + 1 + x];
  }
  return { width, height, rgba };
}
