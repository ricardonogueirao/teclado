// Practice engine: moves through a lesson and judges what the player presses.
// It has no timers or DOM. The UI calls tick() every frame and keyDown()/keyUp()
// on each key press, and acts on the events returned (clicks, accompaniment, feedback).
import { songLengthBeats, type Hand, type Song, type SongNote } from '../music/types';

export type Mode = 'wait' | 'perform' | 'listen';
export type HandsChoice = 'both' | 'R' | 'L';

export interface SessionOptions {
  mode: Mode;
  hands: HandsChoice;
  /** Speed multiplier: 1 = lesson tempo, 0.5 = half speed. */
  tempo: number;
  /** Bars to repeat, 1-based and inclusive. */
  loop: { startBar: number; endBar: number } | null;
  metronome: boolean;
  countInBars: number;
}

export type NoteStatus = 'pending' | 'hit' | 'missed' | 'auto';
export type Grade = 'perfect' | 'good';

export interface NoteState {
  note: SongNote;
  /** True when the player must play this note; false when the app plays it. */
  played: boolean;
  status: NoteStatus;
  grade?: Grade;
  /** How far from the beat the player was, in ms (negative = early). */
  offsetMs?: number;
  sounding: boolean;
  soundDone: boolean;
}

export type EngineEvent =
  | { type: 'click'; downbeat: boolean }
  | { type: 'accOn'; midi: number; hand: Hand }
  | { type: 'accOff'; midi: number }
  | { type: 'judged'; midi: number; result: Grade | 'miss'; offsetMs?: number }
  | { type: 'wrong'; midi: number }
  | { type: 'loop'; lastScore: number }
  | { type: 'finished' };

export interface Stats {
  total: number;
  perfect: number;
  good: number;
  missed: number;
  wrong: number;
}

// Timing windows for performance mode, in real milliseconds.
export const PERFECT_MS = 80;
export const GOOD_MS = 180;
/** In wait mode a note can be played up to this many beats before it reaches the line. */
export const WAIT_EARLY_BEATS = 1;
const EPS = 1e-6;

export function scoreOf(s: Stats): number {
  if (s.total === 0) return 0;
  const raw = (s.perfect + 0.7 * s.good) / (s.total + 0.5 * s.wrong);
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

export function starsFor(score: number): number {
  if (score >= 95) return 3;
  if (score >= 80) return 2;
  if (score >= 60) return 1;
  return 0;
}

export class PracticeEngine {
  readonly song: Song;
  opts: SessionOptions;
  notes: NoteState[] = [];
  /** Position in beats. Negative during the count-in. */
  pos = 0;
  waiting = false;
  finished = false;
  passes = 0;
  stats: Stats = { total: 0, perfect: 0, good: 0, missed: 0, wrong: 0 };
  /** Changes whenever something the UI shows (other than the position) changes. */
  version = 0;

  readonly startBeat: number;
  readonly endBeat: number;
  private lastNow: number | null = null;
  private nextClick = 0;

  constructor(song: Song, opts: SessionOptions) {
    this.song = song;
    this.opts = opts;
    const bpb = song.beatsPerBar;
    const length = songLengthBeats(song);
    this.startBeat = opts.loop ? (opts.loop.startBar - 1) * bpb : 0;
    this.endBeat = opts.loop ? Math.min(length, opts.loop.endBar * bpb) : length;
    this.restart();
  }

  msPerBeat(): number {
    return 60000 / (this.song.bpm * this.opts.tempo);
  }

  setTempo(tempo: number): void {
    this.opts = { ...this.opts, tempo };
  }

  setMetronome(on: boolean): void {
    this.opts = { ...this.opts, metronome: on };
  }

  /** Back to the count-in, clearing results. */
  restart(): void {
    const { mode, hands } = this.opts;
    this.notes = this.song.notes
      .filter((n) => n.start >= this.startBeat - EPS && n.start < this.endBeat - EPS)
      .sort((a, b) => a.start - b.start || a.midi - b.midi)
      .map((note) => {
        const played = mode !== 'listen' && (hands === 'both' || note.hand === hands);
        return { note, played, status: played ? 'pending' : 'auto', sounding: false, soundDone: false };
      });
    this.pos = this.startBeat - this.opts.countInBars * this.song.beatsPerBar;
    this.nextClick = Math.ceil(this.pos - EPS);
    this.stats = { total: this.notes.filter((n) => n.played).length, perfect: 0, good: 0, missed: 0, wrong: 0 };
    this.waiting = false;
    this.finished = false;
    this.lastNow = null;
    this.version++;
  }

  /** Advances the lesson to time `now` (ms, same clock as key events). */
  tick(now: number): EngineEvent[] {
    const events: EngineEvent[] = [];
    if (this.finished) return events;
    const dt = this.lastNow === null ? 0 : Math.max(0, now - this.lastNow);
    this.lastNow = now;

    let target = this.pos + dt / this.msPerBeat();
    const wasWaiting = this.waiting;
    this.waiting = false;
    if (this.opts.mode === 'wait') {
      const groupStart = this.nextGroupStart();
      if (groupStart !== null && target >= groupStart) {
        target = Math.max(this.pos, groupStart);
        this.waiting = true;
      }
    }
    if (wasWaiting !== this.waiting) this.version++;

    while (this.nextClick <= target + EPS) {
      if (this.opts.metronome || this.nextClick < this.startBeat) {
        const inBar = (((this.nextClick - this.startBeat) % this.song.beatsPerBar) + this.song.beatsPerBar) % this.song.beatsPerBar;
        events.push({ type: 'click', downbeat: inBar === 0 });
      }
      this.nextClick++;
    }
    this.pos = target;

    this.soundAccompaniment(events);
    if (this.opts.mode === 'perform') this.markMisses(events);

    if (this.pos >= this.endBeat - EPS && this.allResolved()) this.endPass(events);
    return events;
  }

  keyDown(midi: number, at: number): EngineEvent[] {
    if (this.finished || this.opts.mode === 'listen') return [];
    const posAt = this.positionAt(at);
    const events: EngineEvent[] = [];

    const match = this.opts.mode === 'wait' ? this.matchWait(midi, posAt) : this.matchPerform(midi, posAt);
    if (match) {
      const { state, offsetMs } = match;
      state.status = 'hit';
      state.offsetMs = offsetMs;
      const abs = Math.abs(offsetMs);
      state.grade = this.opts.mode === 'wait' || abs <= PERFECT_MS ? 'perfect' : 'good';
      this.stats[state.grade]++;
      events.push({ type: 'judged', midi, result: state.grade, offsetMs });
    } else if (posAt >= this.startBeat - 0.5) {
      // Presses during the count-in are free; afterwards a wrong key counts.
      this.stats.wrong++;
      events.push({ type: 'wrong', midi });
    }
    this.version++;
    return events;
  }

  keyUp(_midi: number, _at: number): EngineEvent[] {
    // Note length is not judged yet (planned for a later version).
    return [];
  }

  /** Notes the player should press now (wait mode: the group on the line). */
  expectedNotes(): SongNote[] {
    if (this.opts.mode === 'wait') {
      const start = this.nextGroupStart();
      if (start === null || start - this.pos > WAIT_EARLY_BEATS) return [];
      return this.groupAt(start).map((s) => s.note);
    }
    if (this.opts.mode === 'perform') {
      const window = GOOD_MS / this.msPerBeat();
      return this.notes
        .filter((s) => s.played && s.status === 'pending' && Math.abs(s.note.start - this.pos) <= window)
        .map((s) => s.note);
    }
    return [];
  }

  expectedKeys(): number[] {
    return this.expectedNotes().map((n) => n.midi);
  }

  /** Call when the lesson is paused, so the clock does not jump on resume. */
  pauseClock(): void {
    this.lastNow = null;
  }

  /** Accompaniment notes sounding now. */
  soundingKeys(): number[] {
    return this.notes.filter((s) => s.sounding).map((s) => s.note.midi);
  }

  /** Stops the accompaniment, for when the player leaves mid-lesson. */
  stopSound(): EngineEvent[] {
    const events: EngineEvent[] = [];
    for (const s of this.notes) {
      if (s.sounding) {
        s.sounding = false;
        events.push({ type: 'accOff', midi: s.note.midi });
      }
    }
    return events;
  }

  private positionAt(at: number): number {
    if (this.lastNow === null || this.waiting) return this.pos;
    return this.pos + Math.max(0, at - this.lastNow) / this.msPerBeat();
  }

  private nextGroupStart(): number | null {
    for (const s of this.notes) {
      if (s.played && s.status === 'pending') return s.note.start;
    }
    return null;
  }

  private groupAt(start: number): NoteState[] {
    return this.notes.filter((s) => s.played && s.status === 'pending' && Math.abs(s.note.start - start) < EPS);
  }

  private matchWait(midi: number, posAt: number): { state: NoteState; offsetMs: number } | null {
    const start = this.nextGroupStart();
    if (start === null || start - posAt > WAIT_EARLY_BEATS + EPS) return null;
    const state = this.groupAt(start).find((s) => s.note.midi === midi);
    return state ? { state, offsetMs: 0 } : null;
  }

  private matchPerform(midi: number, posAt: number): { state: NoteState; offsetMs: number } | null {
    const mpb = this.msPerBeat();
    let best: { state: NoteState; offsetMs: number } | null = null;
    for (const s of this.notes) {
      if (!s.played || s.status !== 'pending' || s.note.midi !== midi) continue;
      const offsetMs = (posAt - s.note.start) * mpb;
      if (Math.abs(offsetMs) > GOOD_MS) continue;
      if (!best || Math.abs(offsetMs) < Math.abs(best.offsetMs)) best = { state: s, offsetMs };
    }
    return best;
  }

  private soundAccompaniment(events: EngineEvent[]): void {
    for (const s of this.notes) {
      if (s.played || s.soundDone) continue;
      if (!s.sounding && s.note.start <= this.pos + EPS) {
        s.sounding = true;
        events.push({ type: 'accOn', midi: s.note.midi, hand: s.note.hand });
        this.version++;
      }
      if (s.sounding && s.note.start + s.note.dur <= this.pos + EPS) {
        s.sounding = false;
        s.soundDone = true;
        events.push({ type: 'accOff', midi: s.note.midi });
        this.version++;
      }
    }
  }

  private markMisses(events: EngineEvent[]): void {
    const limit = GOOD_MS / this.msPerBeat();
    for (const s of this.notes) {
      if (s.played && s.status === 'pending' && this.pos - s.note.start > limit) {
        s.status = 'missed';
        this.stats.missed++;
        events.push({ type: 'judged', midi: s.note.midi, result: 'miss' });
        this.version++;
      }
    }
  }

  private allResolved(): boolean {
    return this.notes.every((s) => !s.played || s.status !== 'pending');
  }

  private endPass(events: EngineEvent[]): void {
    events.push(...this.stopSound());
    this.passes++;
    if (this.opts.loop) {
      const lastScore = scoreOf(this.stats);
      const countIn = this.opts.countInBars;
      // Repeat without a new count-in: the player is already in time.
      this.opts = { ...this.opts, countInBars: 0 };
      const now = this.lastNow;
      // The click on the last line is also the first beat of the next pass.
      const clicksAhead = Math.max(0, this.nextClick - this.endBeat);
      this.restart();
      this.opts = { ...this.opts, countInBars: countIn };
      this.lastNow = now;
      this.nextClick = this.startBeat + clicksAhead;
      events.push({ type: 'loop', lastScore });
    } else {
      this.finished = true;
      events.push({ type: 'finished' });
    }
    this.version++;
  }
}
