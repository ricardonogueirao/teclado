import { describe, expect, it } from 'vitest';
import { MODULE_1_SOURCES, MODULE_2_SOURCES, MODULE_3_SOURCES, MODULE_4_SOURCES, MODULES } from './lessons';
import { noteValue } from '../notation/sheetLayout';
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
  it.each([...MODULE_1_SOURCES, ...MODULE_2_SOURCES, ...MODULE_3_SOURCES, ...MODULE_4_SOURCES].map((s) => [s.title, s] as const))('%s has whole bars in both hands', (_t, src) => {
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

  const allSongs = MODULES.flatMap((m) => m.lessons);

  it.each(allSongs.map((s) => [s.title, s] as const))('%s can be written as sheet music', (_t, song) => {
    for (const n of song.notes) {
      const barEnd = (Math.floor(n.start / song.beatsPerBar + 1e-9) + 1) * song.beatsPerBar;
      expect(n.start + n.dur, `nota em ${n.start} atravessa a barra`).toBeLessThanOrEqual(barEnd + 1e-9);
      expect(noteValue(n.dur), `duração ${n.dur}`).not.toBeNull();
    }
    // In one hand, notes either form a chord (same start and length) or follow each other.
    for (const hand of ['R', 'L'] as const) {
      const notes = song.notes.filter((n) => n.hand === hand).sort((a, b) => a.start - b.start);
      for (let i = 1; i < notes.length; i++) {
        const [a, b] = [notes[i - 1], notes[i]];
        const chord = a.start === b.start && a.dur === b.dur;
        expect(chord || b.start >= a.start + a.dur - 1e-9, `${hand} ${a.start}/${b.start}`).toBe(true);
      }
    }
  });

  it('module 3 uses both hands, with a finger on every note', () => {
    for (const src of MODULE_3_SOURCES) {
      expect(src.right && src.left, src.title).toBeTruthy();
      for (const n of [...seq('R', src.right!), ...seq('L', src.left!)]) expect(n.finger, src.title).toBeDefined();
    }
  });

  it('module 4 puts a finger on every note and has real chords', () => {
    for (const src of MODULE_4_SOURCES) {
      const notes = [...(src.right ? seq('R', src.right) : []), ...(src.left ? seq('L', src.left) : [])];
      for (const n of notes) expect(n.finger, src.title).toBeDefined();
      expect(notes.some((a) => notes.some((b) => a !== b && a.hand === b.hand && a.start === b.start)), src.title).toBe(true);
    }
  });

  it('gives each note of a chord its own finger', () => {
    expect(seq('R', 'C4@1+E4@3+G4@5/2')).toEqual([
      { midi: 60, start: 0, dur: 2, hand: 'R', finger: 1 },
      { midi: 64, start: 0, dur: 2, hand: 'R', finger: 3 },
      { midi: 67, start: 0, dur: 2, hand: 'R', finger: 5 },
    ]);
  });

  it('every lesson has a whole-number tempo for the keyboard metronome', () => {
    for (const song of MODULES.flatMap((m) => m.lessons)) expect(Number.isInteger(song.bpm), song.title).toBe(true);
  });

  it('has unique ids', () => {
    const ids = MODULES.flatMap((m) => m.lessons.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
