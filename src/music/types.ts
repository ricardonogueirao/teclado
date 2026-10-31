/** Right hand, left hand, or 'A': accompaniment the app always plays (from imported songs). */
export type Hand = 'R' | 'L' | 'A';

/** How the lesson is shown: falling notes, sheet music, or both. */
export type ViewMode = 'falling' | 'sheet' | 'both';

/** One note of a lesson. Times are in beats (quarter notes), counted from 0. */
export interface SongNote {
  midi: number;
  start: number;
  dur: number;
  hand: Hand;
  finger?: number;
}

export interface Song {
  id: string;
  title: string;
  /** What the lesson teaches, shown before playing. */
  goal: string;
  bpm: number;
  /** Bar length in quarter-note beats (6/8 = 3). */
  beatsPerBar: number;
  notes: SongNote[];
  /** View the lesson opens in, when it is meant for reading practice. */
  view?: ViewMode;
  /** Time signature as written, e.g. [6, 8]. Defaults to beatsPerBar/4. */
  timeSig?: [number, number];
  /** Key signature: sharps (positive) or flats (negative). Defaults to C major. */
  keyFifths?: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Song[];
}

/** Total length in beats, rounded up to the end of the last bar. */
export function songLengthBeats(song: Song): number {
  const end = song.notes.reduce((max, n) => Math.max(max, n.start + n.dur), 0);
  return Math.ceil(end / song.beatsPerBar) * song.beatsPerBar;
}

export function hasHand(song: Song, hand: Hand): boolean {
  return song.notes.some((n) => n.hand === hand);
}

export function timeSignature(song: Song): [number, number] {
  return song.timeSig ?? [song.beatsPerBar, 4];
}
