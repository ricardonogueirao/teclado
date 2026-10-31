import { describe, expect, it } from 'vitest';
import { buildSong } from '../music/lessons';
import { buildMeasures, noteValue, restsFor, vexKey } from './sheetLayout';

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
