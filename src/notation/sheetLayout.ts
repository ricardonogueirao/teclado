// Turns a lesson into bars of notation: one staff per hand (right = treble, left = bass),
// with chords grouped and the gaps filled with rests. No drawing here, so it can be tested.
import { songLengthBeats, type Hand, type Song, type SongNote } from '../music/types';

export interface SheetEvent {
  /** Beat where it starts, from the beginning of the song. */
  start: number;
  dur: number;
  /** Empty for a rest. */
  notes: SongNote[];
  /** Tied to the next event (the same notes, held). */
  tied?: boolean;
  /** Second or later piece of a held note: no name or finger is written again. */
  continued?: boolean;
}

export interface SheetMeasure {
  index: number;
  start: number;
  beats: number;
  staves: Partial<Record<Hand, SheetEvent[]>>;
}

export interface NoteValue {
  /** VexFlow duration code: w, h, q, 8, 16. */
  code: string;
  dots: number;
}

const EPS = 1e-6;

// Beat lengths that can be written as one note (in quarter-note beats).
const VALUES: [number, NoteValue][] = [
  [4, { code: 'w', dots: 0 }],
  [3, { code: 'h', dots: 1 }],
  [2, { code: 'h', dots: 0 }],
  [1.5, { code: 'q', dots: 1 }],
  [1, { code: 'q', dots: 0 }],
  [0.75, { code: '8', dots: 1 }],
  [0.5, { code: '8', dots: 0 }],
  [0.25, { code: '16', dots: 0 }],
];

export function noteValue(beats: number): NoteValue | null {
  const hit = VALUES.find(([b]) => Math.abs(b - beats) < EPS);
  return hit ? hit[1] : null;
}

/** Splits a silence into rests that line up with the beats, the way it is usually written. */
export function restsFor(from: number, to: number, barStart: number, beatsPerBar: number): [number, number][] {
  const rests: [number, number][] = [];
  let t = from;
  while (to - t > EPS) {
    const inBar = t - barStart;
    const left = to - t;
    let d: number;
    if (inBar < EPS && Math.abs(left - beatsPerBar) < EPS) d = beatsPerBar; // whole-bar rest
    else if (left >= 2 - EPS && Math.abs(inBar % 2) < EPS) d = 2;
    else if (left >= 1 - EPS && Math.abs(inBar % 1) < EPS) d = 1;
    else if (left >= 0.5 - EPS && Math.abs(inBar % 0.5) < EPS) d = 0.5;
    else d = Math.min(0.25, left);
    rests.push([t, d]);
    t += d;
  }
  return rests;
}

export function staffHands(song: Song): Hand[] {
  const hands: Hand[] = [];
  if (song.notes.some((n) => n.hand === 'R')) hands.push('R');
  if (song.notes.some((n) => n.hand === 'L')) hands.push('L');
  return hands;
}

/** Notation is drawn on a sixteenth-note grid; odd timings (triplets, swing) are rounded to it. */
const GRID = 4;
const q = (x: number) => Math.round(x * GRID) / GRID;

interface Span {
  start: number;
  end: number;
  notes: SongNote[];
}

/**
 * One staff as a single line of chords and rests. Notes that start together form a chord;
 * a chord lasts until its notes end or the next chord starts, whichever comes first
 * (so a held note under moving notes is shown shorter, which keeps the staff readable).
 */
function staffSpans(notes: SongNote[], total: number): Span[] {
  const byStart = new Map<number, SongNote[]>();
  for (const n of notes) {
    const s = q(n.start);
    byStart.set(s, [...(byStart.get(s) ?? []), n]);
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  const spans: Span[] = [];
  let t = 0;
  starts.forEach((s, i) => {
    if (s > t + EPS) spans.push({ start: t, end: s, notes: [] });
    const chord = byStart.get(s)!.sort((a, b) => a.midi - b.midi);
    const next = starts[i + 1] ?? total;
    const end = Math.min(Math.max(Math.max(...chord.map((n) => q(n.start + n.dur))), s + 1 / GRID), next);
    spans.push({ start: s, end, notes: chord });
    t = end;
  });
  if (total > t + EPS) spans.push({ start: t, end: total, notes: [] });
  return spans;
}

/** Splits a held note into written values (longest first); the pieces are tied together. */
export function notePieces(from: number, to: number): [number, number][] {
  const pieces: [number, number][] = [];
  let t = from;
  while (to - t > EPS) {
    const left = to - t;
    const hit = VALUES.find(([b]) => b <= left + EPS);
    const d = hit ? hit[0] : left;
    pieces.push([t, d]);
    t += d;
  }
  return pieces;
}

export function buildMeasures(song: Song): SheetMeasure[] {
  const bpb = song.beatsPerBar;
  const total = songLengthBeats(song);
  const hands = staffHands(song);
  const measures: SheetMeasure[] = [];
  for (let i = 0; i * bpb < total - EPS; i++) measures.push({ index: i, start: i * bpb, beats: bpb, staves: {} });
  for (const m of measures) for (const hand of hands) m.staves[hand] = [];

  for (const hand of hands) {
    const spans = staffSpans(
      song.notes.filter((n) => n.hand === hand),
      total,
    );
    for (const span of spans) {
      // Cut at bar lines, then into values that can be written.
      let t = span.start;
      const pieces: SheetEvent[] = [];
      while (span.end - t > EPS) {
        const bar = Math.floor(t / bpb + EPS);
        const barStart = bar * bpb;
        const cut = Math.min(span.end, barStart + bpb);
        const parts = span.notes.length ? notePieces(t, cut) : restsFor(t, cut, barStart, bpb);
        for (const [ps, pd] of parts) pieces.push({ start: ps, dur: pd, notes: span.notes });
        t = cut;
      }
      pieces.forEach((p, k) => {
        if (span.notes.length) {
          p.tied = k < pieces.length - 1;
          p.continued = k > 0;
        }
        measures[Math.floor(p.start / bpb + EPS)]?.staves[hand]!.push(p);
      });
    }
  }
  return measures;
}

const SHARP_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const FLAT_NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

/** VexFlow key for a MIDI note, e.g. 60 -> "c/4", 61 -> "c#/4" (or "db/4" in flat keys). */
export function vexKey(midi: number, flats = false): string {
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  return `${names[((midi % 12) + 12) % 12]}/${Math.floor(midi / 12) - 1}`;
}

/** VexFlow key signature name for a number of sharps (+) or flats (-). */
export function keySpec(fifths: number): string {
  return MAJOR_KEYS[Math.max(-7, Math.min(7, Math.round(fifths))) + 7];
}
