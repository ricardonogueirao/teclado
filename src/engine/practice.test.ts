import { describe, expect, it } from 'vitest';
import type { Song } from '../music/types';
import { PracticeEngine, scoreOf, starsFor, type SessionOptions } from './practice';

// 60 bpm => 1 beat = 1000 ms, which keeps the arithmetic readable.
const song: Song = {
  id: 't',
  title: 'Teste',
  goal: '',
  bpm: 60,
  beatsPerBar: 4,
  notes: [
    { midi: 60, start: 0, dur: 1, hand: 'R' },
    { midi: 62, start: 1, dur: 1, hand: 'R' },
    { midi: 64, start: 2, dur: 1, hand: 'R' },
    { midi: 48, start: 0, dur: 4, hand: 'L' },
    { midi: 65, start: 3, dur: 1, hand: 'R' },
  ],
};

const base: SessionOptions = {
  mode: 'wait',
  hands: 'both',
  tempo: 1,
  loop: null,
  metronome: false,
  countInBars: 0,
};

function engine(opts: Partial<SessionOptions> = {}) {
  const e = new PracticeEngine(song, { ...base, ...opts });
  e.tick(0);
  return e;
}

describe('wait mode', () => {
  it('stops on each note until the right key is pressed', () => {
    const e = engine({ hands: 'R' });
    e.tick(5000);
    expect(e.pos).toBe(0);
    expect(e.waiting).toBe(true);
    expect(e.expectedKeys()).toEqual([60]);

    const ev = e.keyDown(60, 5000);
    expect(ev).toEqual([{ type: 'judged', midi: 60, result: 'perfect', offsetMs: 0 }]);
    e.tick(5500);
    expect(e.pos).toBeCloseTo(0.5);
    e.tick(9000);
    expect(e.pos).toBe(1);
    expect(e.expectedKeys()).toEqual([62]);
  });

  it('counts a wrong key and keeps waiting', () => {
    const e = engine({ hands: 'R' });
    e.tick(100);
    expect(e.keyDown(61, 100)).toEqual([{ type: 'wrong', midi: 61 }]);
    expect(e.stats.wrong).toBe(1);
    e.tick(2000);
    expect(e.pos).toBe(0);
  });

  it('waits for every note of a chord', () => {
    const e = engine({ hands: 'both' });
    e.tick(10);
    expect(e.expectedKeys().sort()).toEqual([48, 60]);
    e.keyDown(60, 10);
    e.tick(500);
    expect(e.waiting).toBe(true);
    e.keyDown(48, 500);
    e.tick(1000);
    expect(e.pos).toBeGreaterThan(0);
  });

  it('plays the other hand as accompaniment', () => {
    const e = new PracticeEngine(song, { ...base, hands: 'R' });
    const ev = e.tick(0);
    expect(ev).toContainEqual({ type: 'accOn', midi: 48, hand: 'L' });
    expect(e.soundingKeys()).toEqual([48]);
  });

  it('finishes after the last note and reports a score', () => {
    const e = engine({ hands: 'R' });
    let t = 0;
    for (const m of [60, 62, 64, 65]) {
      t += 1000;
      e.tick(t);
      e.keyDown(m, t);
    }
    const ev = e.tick(t + 2000);
    expect(ev).toContainEqual({ type: 'finished' });
    expect(e.finished).toBe(true);
    expect(scoreOf(e.stats)).toBe(100);
  });
});

describe('performance mode', () => {
  it('grades by timing: perfect, good, and too far', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.tick(40);
    expect(e.keyDown(60, 40)[0]).toMatchObject({ result: 'perfect', offsetMs: 40 });
    e.tick(850);
    const second = e.keyDown(62, 850)[0] as { result: string; offsetMs: number };
    expect(second.result).toBe('good');
    expect(second.offsetMs).toBeCloseTo(-150);
    e.tick(1500);
    // 500 ms early for the third note: not accepted.
    expect(e.keyDown(64, 1500)).toEqual([{ type: 'wrong', midi: 64 }]);
  });

  it('marks notes nobody played as missed', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    const ev = e.tick(1100);
    expect(ev).toContainEqual({ type: 'judged', midi: 60, result: 'miss' });
    expect(e.stats.missed).toBe(1);
  });

  it('slower tempo widens the time between notes', () => {
    const e = engine({ mode: 'perform', hands: 'R', tempo: 0.5 });
    expect(e.msPerBeat()).toBe(2000);
    e.tick(1990);
    expect(e.keyDown(62, 1990)[0]).toMatchObject({ result: 'perfect' });
  });

  it('uses the key event time, not the last frame time', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.tick(900);
    // Pressed 100 ms after the last frame, exactly on beat 1.
    expect(e.keyDown(62, 1000)[0]).toMatchObject({ result: 'perfect', offsetMs: 0 });
  });
});

describe('count-in and metronome', () => {
  it('clicks one bar before starting, with the downbeat marked', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'perform', countInBars: 1 });
    e.tick(0);
    expect(e.pos).toBe(-4);
    const clicks = e.tick(3500).filter((x) => x.type === 'click');
    expect(clicks.map((c) => (c as { downbeat: boolean }).downbeat)).toEqual([false, false, false]);
    // The first click (beat -4) fired on the first tick.
  });

  it('wrong keys during the count-in are free', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'perform', countInBars: 1 });
    e.tick(0);
    expect(e.keyDown(70, 0)).toEqual([]);
    expect(e.stats.wrong).toBe(0);
  });
});

describe('loop', () => {
  it('repeats the chosen bars and reports each pass', () => {
    const twoBars: Song = {
      ...song,
      notes: [
        { midi: 60, start: 0, dur: 4, hand: 'R' },
        { midi: 67, start: 4, dur: 4, hand: 'R' },
      ],
    };
    const e = new PracticeEngine(twoBars, { ...base, mode: 'perform', loop: { startBar: 2, endBar: 2 } });
    e.tick(0);
    expect(e.notes.map((n) => n.note.midi)).toEqual([67]);
    expect(e.pos).toBe(4);
    e.keyDown(67, 0);
    const ev = e.tick(4100);
    expect(ev).toContainEqual({ type: 'loop', lastScore: 100 });
    expect(e.finished).toBe(false);
    expect(e.pos).toBe(4);
    expect(e.notes[0].status).toBe('pending');
  });
});

describe('accompaniment from imported songs', () => {
  it('is always played by the app, even with both hands', () => {
    const withBand: Song = { ...song, notes: [...song.notes, { midi: 40, start: 0, dur: 2, hand: 'A' }] };
    const e = new PracticeEngine(withBand, { ...base, hands: 'both' });
    const ev = e.tick(0);
    expect(ev).toContainEqual({ type: 'accOn', midi: 40, hand: 'A' });
    expect(e.stats.total).toBe(5);
  });
});

describe('listen mode', () => {
  it('plays everything and never judges', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'listen' });
    const ev = e.tick(0);
    expect(ev.filter((x) => x.type === 'accOn')).toHaveLength(2);
    expect(e.keyDown(60, 10)).toEqual([]);
  });
});

describe('score', () => {
  it('weighs good hits and wrong keys', () => {
    expect(scoreOf({ total: 10, perfect: 10, good: 0, missed: 0, wrong: 0 })).toBe(100);
    expect(scoreOf({ total: 10, perfect: 5, good: 5, missed: 0, wrong: 0 })).toBe(85);
    expect(scoreOf({ total: 10, perfect: 10, good: 0, missed: 0, wrong: 2 })).toBe(91);
    expect(starsFor(95)).toBe(3);
    expect(starsFor(80)).toBe(2);
    expect(starsFor(60)).toBe(1);
    expect(starsFor(59)).toBe(0);
  });
});
