// What any imported file (MIDI or MusicXML) is turned into before the user picks the hands.

export interface ImportedNote {
  midi: number;
  /** In quarter-note beats from the start. */
  start: number;
  dur: number;
  finger?: number;
}

/** Who plays a track: right hand, left hand, the app (accompaniment), or nobody. */
export type TrackRole = 'R' | 'L' | 'A' | 'off';

export interface ImportedTrack {
  id: string;
  name: string;
  notes: ImportedNote[];
  /** Percussion is never offered as a hand. */
  drums: boolean;
}

export interface ImportedScore {
  title: string;
  bpm: number;
  /** Time signature, e.g. [3, 4] or [6, 8]. */
  timeSig: [number, number];
  /** Key signature: number of sharps (positive) or flats (negative). */
  keyFifths: number;
  tracks: ImportedTrack[];
  format: 'midi' | 'musicxml';
}
