// Turns a lesson into bars of notation: one staff per hand (right = treble, left = bass),
// with chords grouped and the gaps filled with rests. No drawing here, so it can be tested.
import { songLengthBeats, type Hand, type Song, type SongNote } from '../music/types';

export interface SheetEvent {
  /** Beat where it starts, from the beginning of the song. */
  start: number;
  dur: number;
  /** Empty for a rest. */
  notes: SongNote[];
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

export function buildMeasures(song: Song): SheetMeasure[] {
  const bpb = song.beatsPerBar;
  const total = songLengthBeats(song);
  const hands = staffHands(song);
  const measures: SheetMeasure[] = [];

  for (let i = 0; i * bpb < total - EPS; i++) {
    const start = i * bpb;
    const end = start + bpb;
    const staves: SheetMeasure['staves'] = {};
    for (const hand of hands) {
      const inBar = song.notes
        .filter((n) => n.hand === hand && n.start >= start - EPS && n.start < end - EPS)
        .sort((a, b) => a.start - b.start || a.midi - b.midi);

      // Notes that start together form one chord.
      const chords: SheetEvent[] = [];
      for (const n of inBar) {
        const last = chords[chords.length - 1];
        if (last && Math.abs(last.start - n.start) < EPS) last.notes.push(n);
        else chords.push({ start: n.start, dur: Math.min(n.dur, end - n.start), notes: [n] });
      }

      const events: SheetEvent[] = [];
      let t = start;
      for (const c of chords) {
        if (c.start - t > EPS) for (const [rs, rd] of restsFor(t, c.start, start, bpb)) events.push({ start: rs, dur: rd, notes: [] });
        events.push(c);
        t = Math.max(t, c.start + c.dur);
      }
      if (end - t > EPS) for (const [rs, rd] of restsFor(t, end, start, bpb)) events.push({ start: rs, dur: rd, notes: [] });
      staves[hand] = events;
    }
    measures.push({ index: i, start, beats: bpb, staves });
  }
  return measures;
}

const LETTER = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

/** VexFlow key for a MIDI note, e.g. 60 -> "c/4", 61 -> "c#/4". */
export function vexKey(midi: number): string {
  return `${LETTER[((midi % 12) + 12) % 12]}/${Math.floor(midi / 12) - 1}`;
}
