// Turns an imported score into a lesson, once the user has chosen who plays each track.
import { FANTOM_6_RANGE, type KeyRange } from '../music/notes';
import type { Song, SongNote } from '../music/types';
import type { ImportedScore, ImportedTrack, TrackRole } from './types';

export interface ImportChoices {
  title: string;
  bpm: number;
  roles: Record<string, TrackRole>;
  /** Moves the hands' notes by whole octaves (accompaniment keeps its pitch). */
  octaveShift: number;
}

const PIANO = /piano|pno|klavier|teclado|keyboard|keys/i;
// Times are kept on a fine grid (1/48 of a beat) to clean up rounding from the file.
const GRID = 48;

function average(track: ImportedTrack): number {
  return track.notes.reduce((s, n) => s + n.midi, 0) / Math.max(1, track.notes.length);
}

/** First guess at who plays each track; the user can change it. */
export function suggestRoles(score: ImportedScore): Record<string, TrackRole> {
  const roles: Record<string, TrackRole> = {};
  const melodic = score.tracks.filter((t) => !t.drums);
  score.tracks.forEach((t) => (roles[t.id] = 'off'));
  if (melodic.length === 0) return roles;

  // Prefer piano tracks; otherwise use every melodic track.
  const piano = melodic.filter((t) => PIANO.test(t.name));
  const pool = piano.length ? piano : melodic;
  const sorted = [...pool].sort((a, b) => average(b) - average(a));
  roles[sorted[0].id] = 'R';
  if (sorted.length > 1) roles[sorted[sorted.length - 1].id] = 'L';
  // A piano arrangement with a voice or one or two instruments: the app plays them along.
  const others = melodic.filter((t) => roles[t.id] === 'off');
  if (piano.length && others.length <= 2) others.forEach((t) => (roles[t.id] = 'A'));
  return roles;
}

function outside(midis: number[], shift: number, range: KeyRange): number {
  return midis.filter((m) => m + shift * 12 < range.low || m + shift * 12 > range.high).length;
}

/**
 * Octave shift for the whole song. It only moves away from the written octave when that
 * saves many notes; a few stray notes are better brought in one by one.
 */
export function suggestOctaveShift(score: ImportedScore, roles: Record<string, TrackRole>, range = FANTOM_6_RANGE): number {
  const midis = score.tracks.filter((t) => roles[t.id] === 'R' || roles[t.id] === 'L').flatMap((t) => t.notes.map((n) => n.midi));
  let best = 0;
  for (const shift of [-1, 1, -2, 2, -3, 3]) {
    if (outside(midis, shift, range) < outside(midis, best, range)) best = shift;
  }
  const saved = outside(midis, 0, range) - outside(midis, best, range);
  return saved > Math.max(3, midis.length * 0.05) ? best : 0;
}

export function countOutside(score: ImportedScore, roles: Record<string, TrackRole>, shift: number, range = FANTOM_6_RANGE): number {
  const midis = score.tracks.filter((t) => roles[t.id] === 'R' || roles[t.id] === 'L').flatMap((t) => t.notes.map((n) => n.midi));
  return outside(midis, shift, range);
}

function snap(x: number): number {
  return Math.round(x * GRID) / GRID;
}

export function buildImportedSong(
  score: ImportedScore,
  choices: ImportChoices,
  id: string,
  fileName: string,
  range = FANTOM_6_RANGE,
): Song {
  const notes: SongNote[] = [];
  const seen = new Set<string>();
  for (const track of score.tracks) {
    const role = choices.roles[track.id];
    if (!role || role === 'off') continue;
    for (const n of track.notes) {
      let midi = n.midi;
      if (role !== 'A') {
        midi += choices.octaveShift * 12;
        // Notes still off the 61 keys are moved by octaves until they fit.
        while (midi < range.low) midi += 12;
        while (midi > range.high) midi -= 12;
      }
      const start = snap(n.start);
      const dur = Math.max(1 / GRID, snap(n.dur));
      const key = `${role}:${midi}:${start}`;
      if (seen.has(key)) continue; // same note twice in one hand (e.g. after moving an octave)
      seen.add(key);
      notes.push({ midi, start, dur, hand: role, ...(n.finger && role !== 'A' ? { finger: n.finger } : {}) });
    }
  }
  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);

  // Skip silence before the first bar that has notes.
  const [num, den] = score.timeSig;
  const beatsPerBar = (num * 4) / den;
  const first = notes.length ? notes[0].start : 0;
  const skip = Math.floor(first / beatsPerBar + 1e-9) * beatsPerBar;
  if (skip > 0) notes.forEach((n) => (n.start = snap(n.start - skip)));

  return {
    id,
    title: choices.title.trim() || score.title,
    goal: `Música importada de "${fileName}". Comece no modo Espera e com a velocidade mais baixa; use Repetir compassos nos trechos difíceis.`,
    bpm: Math.max(20, Math.min(300, Math.round(choices.bpm))),
    beatsPerBar,
    timeSig: [num, den],
    keyFifths: score.keyFifths,
    notes,
  };
}
