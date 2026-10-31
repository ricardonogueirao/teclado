export type Hand = 'R' | 'L';

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
  beatsPerBar: number;
  notes: SongNote[];
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
