// Compact way to write lessons by hand.
// "C4/1 D4/1 E4/2 | -/4 | C3+G3/4"
//   note/beats   -/beats = rest   A+B = chord   | = bar line (ignored, for reading)
// Sharps: C#4. Flats: Bb3. Fingers (optional): E4/1@3
// A chord can give each note its own finger: C4@1+E4@3+G4@5/4 (a finger after the beats applies to the whole chord)
import type { Hand, SongNote } from './types';

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function nameToMidi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`Nota inválida: "${name}"`);
  const [, l, acc, oct] = m;
  const shift = acc === '#' ? 1 : acc === 'b' ? -1 : 0;
  return (Number(oct) + 1) * 12 + LETTER_PC[l] + shift;
}

/** Parses a line of notation for one hand, starting at beat `from`. */
export function seq(hand: Hand, text: string, from = 0): SongNote[] {
  const notes: SongNote[] = [];
  let t = from;
  for (const token of text.split(/\s+/)) {
    if (!token || token === '|') continue;
    const m = /^([^/]+)\/([\d.]+)(?:@(\d))?$/.exec(token);
    if (!m) throw new Error(`Trecho inválido: "${token}"`);
    const [, pitches, beats, finger] = m;
    const dur = Number(beats);
    if (pitches !== '-') {
      for (const p of pitches.split('+')) {
        const [name, own] = p.split('@');
        const f = own ?? finger;
        notes.push({ midi: nameToMidi(name), start: t, dur, hand, ...(f ? { finger: Number(f) } : {}) });
      }
    }
    t += dur;
  }
  return notes;
}

/** Total beats a line of notation lasts, rests included. */
export function seqLength(text: string): number {
  return text
    .split(/\s+/)
    .filter((t) => t && t !== '|')
    .reduce((sum, t) => sum + Number(t.split('/')[1].split('@')[0]), 0);
}
