import { describe, expect, it } from 'vitest';
import { buildSong } from '../music/lessons';
import { buildMeasures, keySpec, notePieces, noteValue, restsFor, vexKey } from './sheetLayout';
import type { Song } from '../music/types';

describe('note values', () => {
  it('maps beats to written notes', () => {
    expect(noteValue(1)).toEqual({ code: 'q', dots: 0 });
    expect(noteValue(1.5)).toEqual({ code: 'q', dots: 1 });
    expect(noteValue(3)).toEqual({ code: 'h', dots: 1 });
    expect(noteValue(0.5)).toEqual({ code: '8', dots: 0 });
    expect(noteValue(2.5)).toBeNull();
  });

  it('names keys for VexFlow', () => {
    expect(vexKey(60)).toBe('c/4');
    expect(vexKey(61)).toBe('c#/4');
    expect(vexKey(48)).toBe('c/3');
    expect(vexKey(74)).toBe('d/5');
  });
});

describe('rests', () => {
  it('uses one rest for a whole empty bar', () => {
    expect(restsFor(0, 4, 0, 4)).toEqual([[0, 4]]);
    expect(restsFor(4, 7, 4, 3)).toEqual([[4, 3]]);
  });
  it('splits along the beats', () => {
    expect(restsFor(1, 4, 0, 4)).toEqual([
      [1, 1],
      [2, 2],
    ]);
    expect(restsFor(0.5, 2, 0, 4)).toEqual([
      [0.5, 0.5],
      [1, 1],
    ]);
  });
});

describe('measures', () => {
  const song = buildSong({
    id: 't',
    title: 't',
    goal: '',
    bpm: 60,
    beatsPerBar: 4,
    right: 'C4/1 E4+G4/1 -/2 | D4/0.5 E4/0.5 F4/3',
    left: '-/4 | C3/4',
  });
  const m = buildMeasures(song);

  it('makes one bar per four beats, with a staff per hand', () => {
    expect(m).toHaveLength(2);
    expect(Object.keys(m[0].staves)).toEqual(['R', 'L']);
  });

  it('groups chords and fills gaps with rests', () => {
    const r = m[0].staves.R!;
    expect(r.map((e) => [e.start, e.dur, e.notes.map((n) => n.midi)])).toEqual([
      [0, 1, [60]],
      [1, 1, [64, 67]],
      [2, 2, []],
    ]);
    expect(m[0].staves.L).toEqual([{ start: 0, dur: 4, notes: [] }]);
  });

  it('has only one staff for a one-hand lesson', () => {
    const one = buildMeasures(buildSong({ id: 'x', title: 'x', goal: '', bpm: 60, beatsPerBar: 4, left: 'C3/4' }));
    expect(Object.keys(one[0].staves)).toEqual(['L']);
  });
});

describe('imported music', () => {
  const song = (notes: Song['notes']): Song => ({ id: 'i', title: 'i', goal: '', bpm: 60, beatsPerBar: 4, notes });

  it('ties a note that crosses the bar line', () => {
    const m = buildMeasures(song([{ midi: 60, start: 3, dur: 2, hand: 'R' }]));
    const r0 = m[0].staves.R!;
    const last = r0[r0.length - 1];
    const next = m[1].staves.R![0];
    expect([last.start, last.dur, last.tied]).toEqual([3, 1, true]);
    expect([next.start, next.dur, next.continued, next.tied]).toEqual([4, 1, true, false]);
  });

  it('splits lengths that have no single written value into tied notes', () => {
    expect(notePieces(0, 2.5)).toEqual([
      [0, 2],
      [2, 0.5],
    ]);
    const m = buildMeasures(song([{ midi: 60, start: 0, dur: 2.5, hand: 'R' }]));
    expect(m[0].staves.R!.map((e) => [e.start, e.dur, !!e.tied])).toEqual([
      [0, 2, true],
      [2, 0.5, false],
      [2.5, 0.5, false],
      [3, 1, false],
    ]);
  });

  it('shortens a held note when another note starts in the same hand', () => {
    // Bach-like: C held for two beats while E starts a quarter beat later.
    const m = buildMeasures(
      song([
        { midi: 48, start: 0, dur: 2, hand: 'L' },
        { midi: 52, start: 0.25, dur: 1.75, hand: 'L' },
      ]),
    );
    // 1.75 beats has no single written value: a dotted quarter tied to a sixteenth.
    expect(m[0].staves.L!.slice(0, 3).map((e) => [e.start, e.dur, e.notes.map((n) => n.midi)])).toEqual([
      [0, 0.25, [48]],
      [0.25, 1.5, [52]],
      [1.75, 0.25, [52]],
    ]);
    // Every beat of the bar is accounted for exactly once.
    expect(m[0].staves.L!.reduce((sum, e) => sum + e.dur, 0)).toBe(4);
  });

  it('rounds odd timings (triplets) to sixteenths', () => {
    const m = buildMeasures(
      song([
        { midi: 60, start: 0, dur: 1 / 3, hand: 'R' },
        { midi: 62, start: 1 / 3, dur: 1 / 3, hand: 'R' },
        { midi: 64, start: 2 / 3, dur: 1 / 3, hand: 'R' },
      ]),
    );
    expect(m[0].staves.R!.slice(0, 3).map((e) => e.start)).toEqual([0, 0.25, 0.75]);
  });

  it('spells notes with flats in flat keys', () => {
    expect(vexKey(70, true)).toBe('bb/4');
    expect(keySpec(-3)).toBe('Eb');
    expect(keySpec(2)).toBe('D');
  });
});
