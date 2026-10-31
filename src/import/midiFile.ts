// Reads a Standard MIDI File (.mid) into tracks of notes measured in beats.
import type { ImportedNote, ImportedScore, ImportedTrack } from './types';

class Reader {
  pos = 0;
  constructor(private view: DataView) {}
  get done() {
    return this.pos >= this.view.byteLength;
  }
  u8() {
    return this.view.getUint8(this.pos++);
  }
  u16() {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }
  text(n: number) {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.u8());
    return s;
  }
  /** Variable-length number used for times and lengths in MIDI files. */
  vlq() {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return v;
  }
}

function decodeText(bytes: number[]): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)).trim();
  } catch {
    return String.fromCharCode(...bytes).trim();
  }
}

interface RawTrack {
  name: string;
  notes: (ImportedNote & { channel: number })[];
}

export function parseMidiFile(buffer: ArrayBuffer, fileName = 'Música'): ImportedScore {
  const r = new Reader(new DataView(buffer));
  if (r.text(4) !== 'MThd') throw new Error('Este arquivo não é um MIDI válido.');
  const headerLen = r.u32();
  r.u16(); // format
  const trackCount = r.u16();
  const division = r.u16();
  r.pos = 8 + headerLen;
  if (division & 0x8000) throw new Error('Este MIDI usa tempo em SMPTE, que não é suportado.');
  const tpq = division;

  let tempo: number | null = null;
  let timeSig: [number, number] | null = null;
  let keyFifths: number | null = null;
  let title: string | null = null;
  const raw: RawTrack[] = [];

  for (let t = 0; t < trackCount && !r.done; t++) {
    const id = r.text(4);
    const len = r.u32();
    const end = r.pos + len;
    if (id !== 'MTrk') {
      r.pos = end;
      continue;
    }
    const track: RawTrack = { name: '', notes: [] };
    const open = new Map<number, { tick: number; velocity: number }[]>();
    let tick = 0;
    let status = 0;

    while (r.pos < end) {
      tick += r.vlq();
      let b = r.u8();
      if (b === 0xff) {
        const type = r.u8();
        const n = r.vlq();
        const data: number[] = [];
        for (let i = 0; i < n; i++) data.push(r.u8());
        if (type === 0x03 && !track.name) track.name = decodeText(data);
        if (type === 0x01 && t === 0 && !title && data.length) title = decodeText(data);
        if (type === 0x51 && tempo === null) tempo = 60_000_000 / ((data[0] << 16) | (data[1] << 8) | data[2]);
        if (type === 0x58 && timeSig === null) timeSig = [data[0], 2 ** data[1]];
        if (type === 0x59 && keyFifths === null) keyFifths = data[0] > 127 ? data[0] - 256 : data[0];
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        r.pos += r.vlq();
        continue;
      }
      // Running status: the status byte can be left out when it repeats.
      if (b & 0x80) status = b;
      else r.pos--;
      b = status;
      const kind = b & 0xf0;
      const channel = (b & 0x0f) + 1;
      const d1 = r.u8();
      const d2 = kind === 0xc0 || kind === 0xd0 ? 0 : r.u8();
      const key = channel * 128 + d1;
      if (kind === 0x90 && d2 > 0) {
        const list = open.get(key) ?? [];
        list.push({ tick, velocity: d2 });
        open.set(key, list);
      } else if (kind === 0x80 || (kind === 0x90 && d2 === 0)) {
        const started = open.get(key)?.shift();
        if (started) {
          track.notes.push({
            midi: d1,
            start: started.tick / tpq,
            dur: Math.max(1, tick - started.tick) / tpq,
            channel,
          });
        }
      }
    }
    r.pos = end;
    raw.push(track);
  }

  const tracks: ImportedTrack[] = [];
  raw.forEach((t, i) => {
    if (t.notes.length === 0) return;
    // A track can mix channels (type-0 files put everything in one track): split them.
    const channels = [...new Set(t.notes.map((n) => n.channel))].sort((a, b) => a - b);
    for (const ch of channels) {
      const notes = t.notes
        .filter((n) => n.channel === ch)
        .map(({ midi, start, dur }) => ({ midi, start, dur }))
        .sort((a, b) => a.start - b.start || a.midi - b.midi);
      const base = t.name || `Trilha ${i + 1}`;
      tracks.push({
        id: `t${i}c${ch}`,
        name: channels.length > 1 ? `${base} (canal ${ch})` : base,
        notes,
        drums: ch === 10,
      });
    }
  });

  // MuseScore writes the title as the name of the first track, which has no notes.
  const tempoTrackName = raw[0] && raw[0].notes.length === 0 ? raw[0].name : '';
  return {
    title: title || tempoTrackName || fileName,
    bpm: Math.round(tempo ?? 120),
    timeSig: timeSig ?? [4, 4],
    keyFifths: keyFifths ?? 0,
    tracks,
    format: 'midi',
  };
}
