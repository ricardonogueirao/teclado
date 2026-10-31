// Reads MusicXML (what MuseScore exports) into tracks of notes measured in beats.
// Each staff of each part becomes a track: a piano part gives "clave de sol" and "clave de fá".
// Repeats and 1st/2nd endings are played out in order; ties are joined into one long note.
import type { ImportedNote, ImportedScore, ImportedTrack } from './types';

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const EPS = 1e-6;

interface RawNote extends ImportedNote {
  staff: number;
  tieStart: boolean;
  tieStop: boolean;
}

interface ParsedMeasure {
  length: number;
  notes: RawNote[];
  forwardRepeat: boolean;
  backwardRepeat: boolean;
  repeatTimes: number;
  /** Ending numbers this bar belongs to ("casa 1", "casa 2"), empty if none. */
  endings: number[];
}

interface ParsedPart {
  id: string;
  name: string;
  measures: ParsedMeasure[];
  clefs: Map<number, string>;
  drums: boolean;
}

function child(el: Element, name: string): Element | null {
  for (const c of Array.from(el.children)) if (c.localName === name) return c;
  return null;
}

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name);
}

function num(el: Element | null, fallback = 0): number {
  const v = el ? parseFloat(el.textContent ?? '') : NaN;
  return Number.isFinite(v) ? v : fallback;
}

interface Globals {
  bpm: number | null;
  timeSig: [number, number] | null;
  keyFifths: number | null;
}

function parsePart(partEl: Element, name: string, drumsByPart: boolean, g: Globals): ParsedPart {
  let divisions = 1;
  const clefs = new Map<number, string>();
  const measures: ParsedMeasure[] = [];
  let openEndings: number[] = [];
  let drums = drumsByPart;

  for (const m of children(partEl, 'measure')) {
    const notes: RawNote[] = [];
    let pos = 0;
    let maxPos = 0;
    let lastStart = 0;
    let forwardRepeat = false;
    let backwardRepeat = false;
    let repeatTimes = 2;
    let endings = openEndings;

    for (const el of Array.from(m.children)) {
      switch (el.localName) {
        case 'attributes': {
          const div = child(el, 'divisions');
          if (div) divisions = num(div, 1) || 1;
          const time = child(el, 'time');
          if (time && !g.timeSig) {
            const beats = parseInt(child(time, 'beats')?.textContent ?? '', 10);
            const type = parseInt(child(time, 'beat-type')?.textContent ?? '', 10);
            if (beats > 0 && type > 0) g.timeSig = [beats, type];
          }
          const key = child(el, 'key');
          if (key && g.keyFifths === null) g.keyFifths = num(child(key, 'fifths'), 0);
          for (const clef of children(el, 'clef')) {
            const sign = child(clef, 'sign')?.textContent ?? '';
            clefs.set(parseInt(clef.getAttribute('number') ?? '1', 10), sign);
            if (sign === 'percussion') drums = true;
          }
          break;
        }
        case 'direction':
        case 'sound': {
          const sound = el.localName === 'sound' ? el : child(el, 'sound');
          const tempo = sound?.getAttribute('tempo');
          if (tempo && g.bpm === null) g.bpm = parseFloat(tempo);
          if (g.bpm === null && el.localName === 'direction') {
            const metro = el.getElementsByTagName('metronome')[0];
            if (metro) {
              const unit = child(metro, 'beat-unit')?.textContent ?? 'quarter';
              const perMinute = num(child(metro, 'per-minute'), 0);
              const unitBeats = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 }[unit] ?? 1;
              const dotted = child(metro, 'beat-unit-dot') ? 1.5 : 1;
              if (perMinute > 0) g.bpm = perMinute * unitBeats * dotted;
            }
          }
          break;
        }
        case 'backup':
          pos -= num(child(el, 'duration')) / divisions;
          break;
        case 'forward':
          pos += num(child(el, 'duration')) / divisions;
          maxPos = Math.max(maxPos, pos);
          break;
        case 'barline': {
          const repeat = child(el, 'repeat');
          if (repeat?.getAttribute('direction') === 'forward') forwardRepeat = true;
          if (repeat?.getAttribute('direction') === 'backward') {
            backwardRepeat = true;
            repeatTimes = parseInt(repeat.getAttribute('times') ?? '2', 10) || 2;
          }
          const ending = child(el, 'ending');
          if (ending) {
            const nums = (ending.getAttribute('number') ?? '')
              .split(/[\s,]+/)
              .map((n) => parseInt(n, 10))
              .filter((n) => n > 0);
            const type = ending.getAttribute('type');
            if (type === 'start') {
              endings = nums;
              openEndings = nums;
            } else if (type === 'stop' || type === 'discontinue') {
              openEndings = [];
            }
          }
          break;
        }
        case 'note': {
          if (child(el, 'grace') || child(el, 'cue')) {
            if (child(el, 'cue') && !child(el, 'chord')) pos += num(child(el, 'duration')) / divisions;
            break;
          }
          const dur = num(child(el, 'duration')) / divisions;
          const chord = !!child(el, 'chord');
          const start = chord ? lastStart : pos;
          const pitch = child(el, 'pitch');
          if (pitch && !child(el, 'rest')) {
            const step = child(pitch, 'step')?.textContent ?? 'C';
            const midi =
              (parseInt(child(pitch, 'octave')?.textContent ?? '4', 10) + 1) * 12 +
              (STEP_PC[step] ?? 0) +
              Math.round(num(child(pitch, 'alter'), 0));
            const ties = children(el, 'tie').map((t) => t.getAttribute('type'));
            const fingerText = el.getElementsByTagName('fingering')[0]?.textContent;
            const finger = fingerText ? parseInt(fingerText, 10) : NaN;
            notes.push({
              midi,
              start,
              dur,
              staff: parseInt(child(el, 'staff')?.textContent ?? '1', 10),
              tieStart: ties.includes('start'),
              tieStop: ties.includes('stop'),
              ...(finger >= 1 && finger <= 5 ? { finger } : {}),
            });
          }
          if (!chord) {
            lastStart = pos;
            pos += dur;
          }
          maxPos = Math.max(maxPos, pos);
          break;
        }
      }
    }
    measures.push({
      length: maxPos,
      notes,
      forwardRepeat,
      backwardRepeat,
      repeatTimes,
      endings,
    });
  }
  return { id: partEl.getAttribute('id') ?? '', name, measures, clefs, drums };
}

/** Order in which the bars are played, following repeats and 1st/2nd endings. */
export function playOrder(measures: Pick<ParsedMeasure, 'forwardRepeat' | 'backwardRepeat' | 'repeatTimes' | 'endings'>[]): number[] {
  const order: number[] = [];
  const done = new Map<number, number>();
  let repeatStart = 0;
  let pass = 1;
  let i = 0;
  let guard = 0;
  while (i < measures.length && guard++ < 10_000) {
    const m = measures[i];
    if (m.forwardRepeat && repeatStart !== i) {
      repeatStart = i;
      pass = 1;
    }
    if (m.endings.length && !m.endings.includes(pass)) {
      i++;
      continue;
    }
    order.push(i);
    // Last bar of the last ending: the repeated section is over.
    if (m.endings.length && !m.backwardRepeat && !measures[i + 1]?.endings.length) {
      repeatStart = i + 1;
      pass = 1;
    }
    if (m.backwardRepeat) {
      const times = done.get(i) ?? 0;
      if (times < m.repeatTimes - 1) {
        done.set(i, times + 1);
        pass++;
        i = repeatStart;
        continue;
      }
      repeatStart = i + 1;
      pass = 1;
    }
    i++;
  }
  return order;
}

/** Joins tied notes into one, in play order. */
function joinTies(notes: RawNote[]): ImportedNote[] {
  const out: ImportedNote[] = [];
  const open = new Map<string, ImportedNote>();
  for (const n of notes.sort((a, b) => a.start - b.start)) {
    const key = `${n.staff}:${n.midi}`;
    const prev = open.get(key);
    if (n.tieStop && prev && Math.abs(prev.start + prev.dur - n.start) < 0.01) {
      prev.dur = n.start + n.dur - prev.start;
      if (!n.tieStart) open.delete(key);
      continue;
    }
    const note: ImportedNote = { midi: n.midi, start: n.start, dur: n.dur, ...(n.finger ? { finger: n.finger } : {}) };
    out.push(note);
    if (n.tieStart) open.set(key, note);
    else open.delete(key);
  }
  return out;
}

export function parseMusicXml(xml: string, fileName = 'Música'): ImportedScore {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Não consegui ler este MusicXML.');
  const root = doc.documentElement;
  if (root.localName === 'score-timewise') throw new Error('Este MusicXML está no formato "timewise", que não é suportado.');
  if (root.localName !== 'score-partwise') throw new Error('Este arquivo não é um MusicXML.');

  const title =
    root.getElementsByTagName('work-title')[0]?.textContent?.trim() ||
    root.getElementsByTagName('movement-title')[0]?.textContent?.trim() ||
    Array.from(root.getElementsByTagName('credit'))
      .find((c) => child(c, 'credit-type')?.textContent === 'title')
      ?.getElementsByTagName('credit-words')[0]
      ?.textContent?.trim() ||
    fileName;

  const partInfo = new Map<string, { name: string; drums: boolean }>();
  for (const sp of Array.from(root.getElementsByTagName('score-part'))) {
    const clean = (t?: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();
    const name = clean(child(sp, 'part-name')?.textContent) || clean(child(sp, 'part-abbreviation')?.textContent) || 'Parte';
    const instrument = sp.getElementsByTagName('instrument-name')[0]?.textContent ?? '';
    const drums = /drum|percuss|bateria/i.test(`${name} ${instrument}`) || !!sp.getElementsByTagName('unpitched')[0];
    partInfo.set(sp.getAttribute('id') ?? '', { name, drums });
  }

  const g: Globals = { bpm: null, timeSig: null, keyFifths: null };
  const parts = children(root, 'part').map((p) => {
    const info = partInfo.get(p.getAttribute('id') ?? '') ?? { name: 'Parte', drums: false };
    return parsePart(p, info.name, info.drums, g);
  });
  if (parts.length === 0) throw new Error('O MusicXML não tem nenhuma parte.');

  const timeSig = g.timeSig ?? [4, 4];
  const barBeats = (timeSig[0] * 4) / timeSig[1];
  const count = Math.max(...parts.map((p) => p.measures.length));
  // Bar lengths and repeats come from the first part; all parts share the same bars.
  const lengths = Array.from({ length: count }, (_, i) => Math.max(...parts.map((p) => p.measures[i]?.length ?? 0)) || barBeats);
  const order = playOrder(parts[0].measures);

  // A short first bar is a pickup (anacrusis): push everything so it ends on the first bar line.
  const pickup = lengths[0] < barBeats - EPS ? barBeats - lengths[0] : 0;

  const tracks: ImportedTrack[] = [];
  for (const part of parts) {
    const raw: RawNote[] = [];
    let offset = pickup;
    for (const i of order) {
      for (const n of part.measures[i]?.notes ?? []) raw.push({ ...n, start: n.start + offset });
      offset += lengths[i];
    }
    const staves = [...new Set(raw.map((n) => n.staff))].sort((a, b) => a - b);
    for (const staff of staves) {
      const notes = joinTies(raw.filter((n) => n.staff === staff));
      if (notes.length === 0) continue;
      const clef = part.clefs.get(staff);
      const clefName = clef === 'F' ? 'clave de fá' : clef === 'G' ? 'clave de sol' : `pauta ${staff}`;
      tracks.push({
        id: `${part.id}-s${staff}`,
        name: staves.length > 1 ? `${part.name} · ${clefName}` : part.name,
        notes: notes.sort((a, b) => a.start - b.start || a.midi - b.midi),
        drums: part.drums,
      });
    }
  }

  return {
    title,
    bpm: Math.round(g.bpm ?? 100),
    timeSig,
    keyFifths: g.keyFifths ?? 0,
    tracks,
    format: 'musicxml',
  };
}
