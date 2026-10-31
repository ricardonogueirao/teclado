// Note names and keyboard facts. MIDI 60 is middle C ("Dó central", C4).

export type NameStyle = 'both' | 'solfege' | 'letters';

const SOLFEGE = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
const LETTERS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const BLACK = new Set([1, 3, 6, 8, 10]);

export const MIDDLE_C = 60;

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function isBlack(midi: number): boolean {
  return BLACK.has(pitchClass(midi));
}

export function octave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function solfege(midi: number): string {
  return SOLFEGE[pitchClass(midi)];
}

export function letter(midi: number): string {
  return LETTERS[pitchClass(midi)];
}

/** Short label for a note, e.g. "Dó · C" or "Ré". */
export function noteLabel(midi: number, style: NameStyle): string {
  if (style === 'solfege') return solfege(midi);
  if (style === 'letters') return letter(midi);
  return `${solfege(midi)} · ${letter(midi)}`;
}

/** Label with octave, for diagnostics: "Dó4 (C4)". */
export function noteLabelWithOctave(midi: number): string {
  const o = octave(midi);
  return `${solfege(midi)}${o} (${letter(midi)}${o})`;
}

// Keyboard ranges. The Fantom 6 has 61 keys: C2..C7 (MIDI 36..96) without octave shift.
export interface KeyRange {
  low: number;
  high: number;
}

export const FANTOM_6_RANGE: KeyRange = { low: 36, high: 96 };
