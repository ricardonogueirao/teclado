// Opens compressed MusicXML (.mxl): a zip file with the score inside.
// Uses the browser's own decompression, so no extra library is needed.

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readEntries(view: DataView): ZipEntry[] {
  // The "end of central directory" record sits in the last 64 KB of the file.
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Este arquivo .mxl está corrompido.');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + p + 46, nameLen));
    entries.push({ name, method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function extract(view: DataView, e: ZipEntry): Promise<Uint8Array> {
  const nameLen = view.getUint16(e.localOffset + 26, true);
  const extraLen = view.getUint16(e.localOffset + 28, true);
  const start = view.byteOffset + e.localOffset + 30 + nameLen + extraLen;
  const data = new Uint8Array(view.buffer.slice(start, start + e.compressedSize));
  if (e.method === 0) return data;
  if (e.method !== 8) throw new Error('Compressão do .mxl não suportada.');
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const reader = source.pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Text of an XML file, whatever its encoding (UTF-8 or UTF-16, as some editors save). */
export function decodeXml(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}

export async function unzipMusicXml(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);
  const entries = readEntries(view);
  const container = entries.find((e) => e.name === 'META-INF/container.xml');
  let target: ZipEntry | undefined;
  if (container) {
    const xml = decodeXml(await extract(view, container));
    const path = /full-path="([^"]+)"/.exec(xml)?.[1];
    target = entries.find((e) => e.name === path);
  }
  target ??= entries.find((e) => !e.name.startsWith('META-INF/') && /\.(xml|musicxml)$/i.test(e.name));
  if (!target) throw new Error('Não encontrei a partitura dentro do arquivo .mxl.');
  return decodeXml(await extract(view, target));
}
