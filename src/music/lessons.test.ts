import { describe, expect, it } from 'vitest';
import { MODULE_1_SOURCES, MODULES } from './lessons';
import { nameToMidi, seq, seqLength } from './notation';
import { FANTOM_6_RANGE } from './notes';

describe('notation', () => {
  it('converts note names', () => {
    expect(nameToMidi('C4')).toBe(60);
    expect(nameToMidi('A4')).toBe(69);
    expect(nameToMidi('C#4')).toBe(61);
    expect(nameToMidi('Bb3')).toBe(58);
    expect(nameToMidi('C2')).toBe(36);
  });
  it('reads rests, chords and fingers', () => {
    expect(seq('L', '-/1 C3+G3/2@5')).toEqual([
      { midi: 48, start: 1, dur: 2, hand: 'L', finger: 5 },
      { midi: 55, start: 1, dur: 2, hand: 'L', finger: 5 },
    ]);
  });
});

describe('lessons', () => {
  it.each(MODULE_1_SOURCES.map((s) => [s.title, s] as const))('%s has whole bars in both hands', (_t, src) => {
    const lengths = [src.right, src.left].filter(Boolean).map((t) => seqLength(t!));
    for (const len of lengths) expect(len % src.beatsPerBar).toBe(0);
    if (lengths.length === 2) expect(lengths[0]).toBe(lengths[1]);
  });

  it('fits on the Fantom 6 (61 keys)', () => {
    for (const song of MODULES.flatMap((m) => m.lessons)) {
      for (const n of song.notes) {
        expect(n.midi).toBeGreaterThanOrEqual(FANTOM_6_RANGE.low);
        expect(n.midi).toBeLessThanOrEqual(FANTOM_6_RANGE.high);
      }
    }
  });

  it('has unique ids', () => {
    const ids = MODULES.flatMap((m) => m.lessons.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
