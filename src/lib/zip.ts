// Wave 92 — Minimal ZIP writer (stored / no compression).
//
// DOCX is a ZIP container of OOXML parts. To keep the export pipeline
// dependency-free (like fdx.ts and pdf.ts), we hand-roll a small ZIP writer that
// uses the STORE method (no deflate) — valid per the ZIP spec and accepted by
// Word, LibreOffice, and every unzip tool. We only need: per-entry local file
// headers, a central directory, and the end-of-central-directory record, plus a
// correct CRC-32 of each entry's bytes.

// ── CRC-32 (IEEE 802.3) with a lazily-built lookup table ──────────────────────
let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  CRC_TABLE = table;
  return table;
}

function crc32(bytes: Uint8Array): number {
  const table = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// UTF-8 encode a string to bytes (works in browser and Node).
function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export interface ZipEntry {
  /** Path inside the archive, e.g. "word/document.xml" */
  name: string;
  /** File contents */
  data: string | Uint8Array;
}

// Little-endian writers into a growing byte array.
class ByteWriter {
  private chunks: number[] = [];
  get length(): number { return this.chunks.length; }
  u8(v: number) { this.chunks.push(v & 0xff); }
  u16(v: number) { this.u8(v); this.u8(v >>> 8); }
  u32(v: number) { this.u16(v & 0xffff); this.u16(v >>> 16); }
  bytes(b: Uint8Array) { for (let i = 0; i < b.length; i++) this.chunks.push(b[i]); }
  toUint8Array(): Uint8Array { return Uint8Array.from(this.chunks); }
}

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/**
 * Build a ZIP archive (STORE method) from a list of entries.
 * Returns the raw archive bytes.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const out = new ByteWriter();
  const central: Array<{
    name: Uint8Array; crc: number; size: number; offset: number;
  }> = [];

  // ── Local file headers + data ───────────────────────────────────────────────
  for (const entry of entries) {
    const nameBytes = utf8(entry.name);
    const dataBytes = typeof entry.data === 'string' ? utf8(entry.data) : entry.data;
    const crc = crc32(dataBytes);
    const offset = out.length;

    out.u32(LOCAL_SIG);
    out.u16(20);            // version needed to extract (2.0)
    out.u16(0x0800);        // general purpose flag: bit 11 = UTF-8 filenames
    out.u16(0);             // compression method: 0 = stored
    out.u16(0);             // mod time
    out.u16(0);             // mod date
    out.u32(crc);           // CRC-32
    out.u32(dataBytes.length); // compressed size (== uncompressed for stored)
    out.u32(dataBytes.length); // uncompressed size
    out.u16(nameBytes.length); // file name length
    out.u16(0);             // extra field length
    out.bytes(nameBytes);
    out.bytes(dataBytes);

    central.push({ name: nameBytes, crc, size: dataBytes.length, offset });
  }

  // ── Central directory ────────────────────────────────────────────────────────
  const centralStart = out.length;
  for (const c of central) {
    out.u32(CENTRAL_SIG);
    out.u16(20);            // version made by
    out.u16(20);            // version needed to extract
    out.u16(0x0800);        // UTF-8 flag
    out.u16(0);             // compression: stored
    out.u16(0);             // mod time
    out.u16(0);             // mod date
    out.u32(c.crc);
    out.u32(c.size);        // compressed size
    out.u32(c.size);        // uncompressed size
    out.u16(c.name.length); // file name length
    out.u16(0);             // extra field length
    out.u16(0);             // file comment length
    out.u16(0);             // disk number start
    out.u16(0);             // internal attributes
    out.u32(0);             // external attributes
    out.u32(c.offset);      // local header offset
    out.bytes(c.name);
  }
  const centralSize = out.length - centralStart;

  // ── End of central directory record ───────────────────────────────────────────
  out.u32(EOCD_SIG);
  out.u16(0);                 // disk number
  out.u16(0);                 // disk with central dir
  out.u16(central.length);    // entries on this disk
  out.u16(central.length);    // total entries
  out.u32(centralSize);       // central dir size
  out.u32(centralStart);      // central dir offset
  out.u16(0);                 // comment length

  return out.toUint8Array();
}
