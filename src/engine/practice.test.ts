import { describe, expect, it } from 'vitest';
import type { Song } from '../music/types';
import { PracticeEngine, gradeFor, scoreOf, starsFor, type EngineEvent, type SessionOptions } from './practice';

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
  metronome: 'off',
  countInBars: 0,
};

function engine(opts: Partial<SessionOptions> = {}) {
  const e = new PracticeEngine(song, { ...base, ...opts });
  e.tick(0);
  return e;
}

const clicks = (ev: EngineEvent[]) => ev.filter((x): x is Extract<EngineEvent, { type: 'click' }> => x.type === 'click');

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

  it('goes on from the moment the key was pressed, not from the last frame', () => {
    const e = engine({ hands: 'R' });
    e.tick(5000);
    e.keyDown(60, 5016);
    e.tick(5516);
    expect(e.pos).toBeCloseTo(0.5);
  });

  it('counts a wrong key and keeps waiting', () => {
    const e = engine({ hands: 'R' });
    e.tick(100);
    expect(e.keyDown(61, 100)).toEqual([{ type: 'wrong', midi: 61 }]);
    expect(e.stats.wrong).toBe(1);
    expect(e.stats.extra).toBe(1);
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
  it('grades by timing: perfect, a little off, clearly off, too far', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.tick(40);
    expect(e.keyDown(60, 40)[0]).toMatchObject({ result: 'perfect', offsetMs: 40 });
    e.tick(900);
    const second = e.keyDown(62, 900)[0] as { result: string; offsetMs: number };
    expect(second.result).toBe('good');
    expect(second.offsetMs).toBeCloseTo(-100);
    e.tick(2250);
    expect(e.keyDown(64, 2250)[0]).toMatchObject({ result: 'off', offsetMs: 250 });
    // 600 ms early for the last note: too far to count for it.
    e.tick(2400);
    expect(e.keyDown(65, 2400)).toEqual([{ type: 'wrong', midi: 65 }]);
    expect(e.timing).toEqual([40, expect.closeTo(-100), 250]);
  });

  it('accepts a late key up to half a beat, within limits', () => {
    expect(new PracticeEngine(song, { ...base, mode: 'perform' }).windowMs()).toBe(350);
    expect(new PracticeEngine({ ...song, bpm: 150 }, { ...base, mode: 'perform' }).windowMs()).toBe(200);
    expect(new PracticeEngine({ ...song, bpm: 100 }, { ...base, mode: 'perform' }).windowMs()).toBe(300);
  });

  it('marks notes nobody played as missed', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    const ev = e.tick(1300);
    expect(ev).toContainEqual({ type: 'judged', midi: 60, result: 'miss' });
    expect(e.stats.missed).toBe(1);
  });

  it('keeps going after a wrong key: the due note is marked and the next ones count', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.tick(10);
    expect(e.keyDown(61, 10)).toEqual([{ type: 'wrong', midi: 61, instead: 60 }]);
    expect(e.notes.find((n) => n.note.midi === 60)?.status).toBe('wrong');
    expect(e.waiting).toBe(false);
    e.tick(1000);
    expect(e.pos).toBe(1);
    expect(e.keyDown(62, 1000)[0]).toMatchObject({ result: 'perfect' });
    // The wrong note is not counted again as missed, and costs no extra points.
    e.tick(1500);
    expect(e.stats).toMatchObject({ wrong: 1, missed: 0, extra: 0, perfect: 1 });
  });

  it('does not punish the right key played right after the wrong one', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.tick(0);
    e.keyDown(61, 0);
    expect(e.keyDown(60, 50)).toEqual([]);
    expect(e.stats).toMatchObject({ wrong: 1, extra: 0 });
  });

  it('counts a key with no note due as an extra key', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.tick(500);
    expect(e.keyDown(70, 500)).toEqual([{ type: 'wrong', midi: 70 }]);
    expect(e.stats).toMatchObject({ wrong: 0, extra: 1 });
    expect(e.notes.map((n) => n.status)).not.toContain('wrong');
  });

  it('a stray key next to a note already played does not spoil the next note', () => {
    const fast: Song = { ...song, bpm: 120, notes: [60, 62, 64, 65].map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.5, hand: 'R' as const })) };
    const e = new PracticeEngine(fast, { ...base, mode: 'perform' });
    e.tick(0);
    e.keyDown(60, 0);
    // A neighbour key brushed together with the first note; the next note is 250 ms away.
    expect(e.keyDown(61, 20)).toEqual([{ type: 'wrong', midi: 61 }]);
    expect(e.notes[1].status).toBe('pending');
  });

  it('a wrong key in a chord marks the chord note still to play', () => {
    const e = engine({ mode: 'perform', hands: 'both' });
    e.tick(0);
    e.keyDown(60, 0);
    // C3 was due with C4; the wrong key is nearer in pitch to C4, but C4 was already played.
    expect(e.keyDown(59, 10)).toEqual([{ type: 'wrong', midi: 59, instead: 48 }]);
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
    // A key event can also be a little older than the last frame.
    e.tick(2030);
    expect(e.keyDown(64, 2000)[0]).toMatchObject({ result: 'perfect', offsetMs: expect.closeTo(0) });
  });

  it('lights the next key half a beat before it arrives', () => {
    const e = engine({ mode: 'perform', hands: 'R' });
    e.keyDown(60, 0);
    e.tick(400);
    expect(e.expectedKeys()).toEqual([]);
    e.tick(600);
    expect(e.expectedKeys()).toEqual([62]);
  });
});

describe('keyboard metronome (the Roland keeps the beat)', () => {
  const roland = { mode: 'perform' as const, hands: 'R' as const, metronome: 'keyboard' as const, countInBars: 1 };

  it('makes no clicks and waits for the first note', () => {
    const e = new PracticeEngine(song, { ...base, ...roland });
    const ev = [...e.tick(0), ...e.tick(3000), ...e.tick(9000)];
    expect(clicks(ev)).toEqual([]);
    expect(e.pos).toBe(0);
    expect(e.waiting).toBe(true);
    expect(e.syncing).toBe(true);
    expect(e.expectedKeys()).toEqual([60]);
  });

  it('a wrong key before the start does not count', () => {
    const e = new PracticeEngine(song, { ...base, ...roland });
    e.tick(0);
    e.tick(5000);
    expect(e.keyDown(61, 5000)).toEqual([{ type: 'wrong', midi: 61 }]);
    expect(e.stats).toMatchObject({ wrong: 0, extra: 0 });
  });

  it('starts the beat on the first note, at the exact time it was pressed', () => {
    const e = new PracticeEngine(song, { ...base, ...roland });
    e.tick(0);
    e.tick(9000);
    expect(e.keyDown(60, 9010)[0]).toMatchObject({ result: 'perfect', offsetMs: 0 });
    expect(e.syncing).toBe(false);
    e.tick(9510);
    expect(e.pos).toBeCloseTo(0.5);
    // On the Roland's next click, 1000 ms after the first note.
    expect(e.keyDown(62, 10010)[0]).toMatchObject({ result: 'perfect' });
  });

  it('fine-tunes the beat with the first notes, then judges against it', () => {
    const e = new PracticeEngine(song, { ...base, ...roland });
    e.tick(0);
    // The first note came 60 ms early; the next ones are on the Roland's clicks (1000, 2000, 3000).
    e.keyDown(60, -60 + 9000);
    e.tick(9900);
    const second = e.keyDown(62, 10000)[0] as { offsetMs: number };
    // Measured against the first note it would be +60; the average puts the beat 30 ms later.
    expect(second.offsetMs).toBeCloseTo(30);
    e.tick(10900);
    const third = e.keyDown(64, 11000)[0] as { offsetMs: number };
    expect(third.offsetMs).toBeCloseTo(20);
  });

  it('finds the beat again after a pause', () => {
    const e = new PracticeEngine(song, { ...base, ...roland });
    e.tick(0);
    e.keyDown(60, 4000);
    e.tick(4500);
    e.pauseClock();
    expect(e.syncing).toBe(true);
    e.tick(20000);
    e.tick(21000);
    expect(e.pos).toBe(1);
    e.keyDown(62, 21300);
    expect(e.syncing).toBe(false);
    e.tick(21800);
    expect(e.pos).toBeCloseTo(1.5);
  });
});

describe('count-in and metronome', () => {
  it('clicks one bar before starting, with the downbeat marked', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'perform', countInBars: 1 });
    expect(clicks(e.tick(0))).toEqual([{ type: 'click', downbeat: true, at: 0 }]);
    expect(e.pos).toBe(-4);
    const ev = clicks(e.tick(3500));
    expect(ev.map((c) => c.downbeat)).toEqual([false, false, false]);
  });

  it('hands out each click a little early, with the exact time of the beat', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'perform', metronome: 'app' });
    e.tick(0);
    expect(clicks(e.tick(920))).toEqual([{ type: 'click', downbeat: false, at: 1000 }]);
    expect(clicks(e.tick(950))).toEqual([]);
  });

  it('with the metronome off, clicks only in the count-in', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'perform', countInBars: 1 });
    e.tick(0);
    expect(clicks(e.tick(6000)).map((c) => c.at)).toEqual([1000, 2000, 3000]);
  });

  it('wrong keys during the count-in are free', () => {
    const e = new PracticeEngine(song, { ...base, mode: 'perform', countInBars: 1 });
    e.tick(0);
    expect(e.keyDown(70, 0)).toEqual([]);
    expect(e.stats.wrong + e.stats.extra).toBe(0);
  });
});

describe('loop', () => {
  it('repeats the chosen bars and reports each pass, keeping the time exact', () => {
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
    expect(e.pos).toBeCloseTo(4.1);
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
  const stats = { total: 10, perfect: 10, good: 0, off: 0, missed: 0, wrong: 0, extra: 0 };
  it('weighs timing, wrong notes and extra keys', () => {
    expect(scoreOf(stats)).toBe(100);
    expect(scoreOf({ ...stats, perfect: 5, good: 5 })).toBe(85);
    expect(scoreOf({ ...stats, perfect: 5, off: 5 })).toBe(70);
    expect(scoreOf({ ...stats, perfect: 9, wrong: 1 })).toBe(90);
    expect(scoreOf({ ...stats, extra: 2 })).toBe(91);
    expect(starsFor(95)).toBe(3);
    expect(starsFor(80)).toBe(2);
    expect(starsFor(60)).toBe(1);
    expect(starsFor(59)).toBe(0);
  });

  it('grades a key by how far it was from the beat', () => {
    expect(gradeFor(-60)).toBe('perfect');
    expect(gradeFor(61)).toBe('good');
    expect(gradeFor(-140)).toBe('good');
    expect(gradeFor(141)).toBe('off');
  });
});
