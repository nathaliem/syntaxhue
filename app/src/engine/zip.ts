/**
 * A minimal zip writer: every file stored without compression. A `.vsix` is a zip, the files are a few
 * kilobytes of text, and writing it ourselves keeps the page free of a dependency and the output byte-for-byte
 * deterministic (fixed timestamp, fixed order).
 */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 1980-01-01 00:00:00, the earliest time a zip can hold
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const UTF8_FLAG = 0x0800; // names are UTF-8

export type ZipInput = Record<string, string | Uint8Array>;

export function zipStore(files: ZipInput): Uint8Array {
  const enc = new TextEncoder();
  const entries = Object.entries(files).map(([name, data]) => ({
    name: enc.encode(name),
    data: typeof data === "string" ? enc.encode(data) : data,
  }));

  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true); // version needed
    head.setUint16(6, UTF8_FLAG, true);
    head.setUint16(8, 0, true); // stored
    head.setUint16(10, DOS_TIME, true);
    head.setUint16(12, DOS_DATE, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, name.length, true);
    head.setUint16(28, 0, true);
    local.push(new Uint8Array(head.buffer), name, data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); // version made by
    c.setUint16(6, 20, true);
    c.setUint16(8, UTF8_FLAG, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, DOS_TIME, true);
    c.setUint16(14, DOS_DATE, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);

    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Reads a zip made by `zipStore` back into its files. Used by tests and to check a package before offering it. */
export function unzipStore(zip: Uint8Array): Record<string, Uint8Array> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const dec = new TextDecoder();
  const out: Record<string, Uint8Array> = {};
  const end = zip.length - 22;
  if (v.getUint32(end, true) !== 0x06054b50) throw new Error("Not a zip file");
  const count = v.getUint16(end + 10, true);
  let at = v.getUint32(end + 16, true);
  for (let i = 0; i < count; i++) {
    if (v.getUint32(at, true) !== 0x02014b50) throw new Error("Broken zip directory");
    const size = v.getUint32(at + 24, true);
    const nameLen = v.getUint16(at + 28, true);
    const crc = v.getUint32(at + 16, true);
    const localAt = v.getUint32(at + 42, true);
    const name = dec.decode(zip.subarray(at + 46, at + 46 + nameLen));
    const dataAt = localAt + 30 + v.getUint16(localAt + 26, true) + v.getUint16(localAt + 28, true);
    const data = zip.subarray(dataAt, dataAt + size);
    if (crc32(data) !== crc) throw new Error(`Checksum mismatch for ${name}`);
    out[name] = data;
    at += 46 + nameLen;
  }
  return out;
}
