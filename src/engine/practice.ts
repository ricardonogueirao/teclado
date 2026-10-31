// Practice engine: moves through a lesson and judges what the player presses.
// It has no timers or DOM. The UI calls tick() every frame and keyDown()/keyUp()
// on each key press, and acts on the events returned (clicks, accompaniment, feedback).
import { songLengthBeats, type Hand, type Song, type SongNote } from '../music/types';

export type Mode = 'wait' | 'perform' | 'listen';
export type HandsChoice = 'both' | 'R' | 'L';
/**
 * Who keeps the beat. 'keyboard': the player's own keyboard metronome (the Roland), so the app
 * makes no sound and starts the music on the player's first note to line up with it.
 * 'app': the app clicks. 'off': the app clicks only during the count-in.
 */
export type MetronomeSource = 'keyboard' | 'app' | 'off';

export interface SessionOptions {
  mode: Mode;
  hands: HandsChoice;
  /** Speed multiplier: 1 = lesson tempo, 0.5 = half speed. */
  tempo: number;
  /** Bars to repeat, 1-based and inclusive. */
  loop: { startBar: number; endBar: number } | null;
  metronome: MetronomeSource;
  countInBars: number;
}

/** 'wrong': the player pressed another key instead of this note. */
export type NoteStatus = 'pending' | 'hit' | 'missed' | 'wrong' | 'auto';
/** perfect = on the beat, good = a little early/late, off = clearly early/late. */
export type Grade = 'perfect' | 'good' | 'off';

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
  /** `at`: when the click must be heard (same clock as tick and key events). */
  | { type: 'click'; downbeat: boolean; at: number }
  | { type: 'accOn'; midi: number; hand: Hand }
  | { type: 'accOff'; midi: number }
  | { type: 'judged'; midi: number; result: Grade | 'miss'; offsetMs?: number }
  /** `instead`: the note this key took the place of (performance mode). */
  | { type: 'wrong'; midi: number; instead?: number }
  | { type: 'loop'; lastScore: number }
  | { type: 'finished' };

export interface Stats {
  total: number;
  perfect: number;
  good: number;
  off: number;
  /** Notes nobody played. */
  missed: number;
  /** Wrong keys: in performance mode, a key pressed instead of the note that was due. */
  wrong: number;
  /** Keys that cost points on top of the notes: any wrong key in wait mode, a key with no note due in performance mode. */
  extra: number;
}

// Timing grades for performance mode, in real milliseconds.
export const PERFECT_MS = 60;
export const GOOD_MS = 140;
/** A key counts for a note up to half a beat away, but never less than this nor more than MAX. */
export const MIN_WINDOW_MS = 200;
export const MAX_WINDOW_MS = 350;
/** In wait mode a note can be played up to this many beats before it reaches the line. */
export const WAIT_EARLY_BEATS = 1;
/** With the keyboard's metronome, the first notes (this many) fine-tune where the beat is. */
export const SYNC_NOTES = 4;
/** Clicks are handed out this early so the sound can be scheduled on the exact beat. */
const CLICK_AHEAD_MS = 100;
const EPS = 1e-6;

export function scoreOf(s: Stats): number {
  if (s.total === 0) return 0;
  const raw = (s.perfect + 0.7 * s.good + 0.4 * s.off) / (s.total + 0.5 * s.extra);
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

export function starsFor(score: number): number {
  if (score >= 95) return 3;
  if (score >= 80) return 2;
  if (score >= 60) return 1;
  return 0;
}

export function gradeFor(offsetMs: number): Grade {
  const abs = Math.abs(offsetMs);
  if (abs <= PERFECT_MS) return 'perfect';
  if (abs <= GOOD_MS) return 'good';
  return 'off';
}

export class PracticeEngine {
  readonly song: Song;
  opts: SessionOptions;
  notes: NoteState[] = [];
  /** Position in beats. Negative during the count-in. */
  pos = 0;
  waiting = false;
  /** Keyboard metronome: the music waits for the player's first note to know where the beat is. */
  syncing = false;
  finished = false;
  passes = 0;
  stats: Stats = emptyStats(0);
  /** Timing of each note played in performance mode, in play order (ms, negative = early). */
  timing: number[] = [];
  /** Changes whenever something the UI shows (other than the position) changes. */
  version = 0;

  readonly startBeat: number;
  readonly endBeat: number;
  private lastNow: number | null = null;
  private nextClick = 0;
  /** Offsets of the first notes after the player set the beat, measured against that first note. */
  private syncOffsets: number[] = [];
  /** How much later than the first note the beat was moved, in ms. */
  private syncShiftMs = 0;

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

  /** How far from its note a key still counts for it, in ms. */
  windowMs(): number {
    return Math.max(MIN_WINDOW_MS, Math.min(MAX_WINDOW_MS, this.msPerBeat() / 2));
  }

  /** True when the music starts on the player's first note (keyboard metronome, performance mode). */
  get startsOnFirstNote(): boolean {
    return this.opts.metronome === 'keyboard' && this.opts.mode === 'perform';
  }

  setTempo(tempo: number): void {
    this.opts = { ...this.opts, tempo };
    // The keyboard's metronome now runs at another speed: find the beat again on the next note.
    if (this.startsOnFirstNote) this.resync();
  }

  setMetronome(metronome: MetronomeSource): void {
    this.opts = { ...this.opts, metronome };
  }

  /** Back to the count-in, clearing results. */
  restart(): void {
    const { mode, hands } = this.opts;
    this.notes = this.song.notes
      .filter((n) => n.start >= this.startBeat - EPS && n.start < this.endBeat - EPS)
      .sort((a, b) => a.start - b.start || a.midi - b.midi)
      .map((note) => {
        const played = mode !== 'listen' && note.hand !== 'A' && (hands === 'both' || note.hand === hands);
        return { note, played, status: played ? 'pending' : 'auto', sounding: false, soundDone: false };
      });
    this.pos = this.startBeat - this.opts.countInBars * this.song.beatsPerBar;
    this.nextClick = Math.ceil(this.pos - EPS);
    this.stats = emptyStats(this.notes.filter((n) => n.played).length);
    this.timing = [];
    this.waiting = false;
    this.finished = false;
    this.lastNow = null;
    this.syncing = this.startsOnFirstNote;
    this.syncOffsets = [];
    this.syncShiftMs = 0;
    this.version++;
  }

  /** Advances the lesson to time `now` (ms, same clock as key events). */
  tick(now: number): EngineEvent[] {
    const events: EngineEvent[] = [];
    if (this.finished) return events;
    const dt = this.lastNow === null ? 0 : Math.max(0, now - this.lastNow);
    this.lastNow = now;
    const mpb = this.msPerBeat();

    let target = this.pos + dt / mpb;
    // Wait mode stops on every note; the keyboard metronome stops on the first one.
    const hold = this.opts.mode === 'wait' || this.syncing ? this.nextGroupStart() : null;
    const wasWaiting = this.waiting;
    this.waiting = false;
    if (hold !== null && target >= hold) {
      target = Math.max(this.pos, hold);
      this.waiting = true;
    }
    if (wasWaiting !== this.waiting) this.version++;

    let clickLimit = target + CLICK_AHEAD_MS / mpb;
    if (hold !== null) clickLimit = Math.min(clickLimit, hold);
    while (this.nextClick <= clickLimit + EPS) {
      if (this.clickAt(this.nextClick)) {
        const inBar = (((this.nextClick - this.startBeat) % this.song.beatsPerBar) + this.song.beatsPerBar) % this.song.beatsPerBar;
        events.push({ type: 'click', downbeat: inBar === 0, at: now + (this.nextClick - target) * mpb });
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
    const events: EngineEvent[] = [];
    if (this.opts.mode === 'wait') this.keyWait(midi, at, events);
    else if (this.syncing) this.keySync(midi, at, events);
    else this.keyPerform(midi, this.positionAt(at), events);
    this.version++;
    return events;
  }

  keyUp(_midi: number, _at: number): EngineEvent[] {
    // Note length is not judged yet (planned for a later version).
    return [];
  }

  /** Notes the player should press now (wait mode: the group on the line). */
  expectedNotes(): SongNote[] {
    if (this.opts.mode === 'wait' || this.syncing) {
      const start = this.nextGroupStart();
      if (start === null) return [];
      if (this.opts.mode === 'wait' && start - this.pos > WAIT_EARLY_BEATS) return [];
      return this.groupAt(start).map((s) => s.note);
    }
    if (this.opts.mode === 'perform') {
      const mpb = this.msPerBeat();
      const after = this.windowMs() / mpb;
      // Light the key a little before the note arrives, so the hand can get there.
      const before = Math.max(after, 0.5);
      return this.notes
        .filter((s) => s.played && s.status === 'pending' && s.note.start - this.pos <= before && this.pos - s.note.start <= after)
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
    // The keyboard's metronome kept going while paused: find the beat again on the next note.
    if (this.startsOnFirstNote) this.resync();
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

  private clickAt(beat: number): boolean {
    if (this.opts.metronome === 'app') return true;
    if (this.opts.metronome === 'off') return beat < this.startBeat;
    return false;
  }

  private resync(): void {
    this.syncing = this.nextGroupStart() !== null;
    this.syncOffsets = [];
    this.syncShiftMs = 0;
    this.version++;
  }

  /** Beat position when a key was pressed. Key events can be a little older than the last frame. */
  private positionAt(at: number): number {
    if (this.lastNow === null || this.waiting) return this.pos;
    return this.pos + (at - this.lastNow) / this.msPerBeat();
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

  private hit(state: NoteState, grade: Grade, offsetMs: number, events: EngineEvent[]): void {
    state.status = 'hit';
    state.grade = grade;
    state.offsetMs = offsetMs;
    this.stats[grade]++;
    events.push({ type: 'judged', midi: state.note.midi, result: grade, offsetMs });
  }

  private keyWait(midi: number, at: number, events: EngineEvent[]): void {
    const posAt = this.positionAt(at);
    const start = this.nextGroupStart();
    const state =
      start !== null && start - posAt <= WAIT_EARLY_BEATS + EPS
        ? this.groupAt(start).find((s) => s.note.midi === midi)
        : undefined;
    if (state && start !== null) {
      this.hit(state, 'perfect', 0, events);
      // The music goes on from the moment the last note of the group was pressed, not from the last frame.
      if (this.waiting && this.groupAt(start).length === 0 && this.lastNow !== null) {
        this.lastNow = Math.max(this.lastNow, at);
      }
    } else if (posAt >= this.startBeat - 0.5) {
      // Presses during the count-in are free; afterwards a wrong key counts.
      this.stats.wrong++;
      this.stats.extra++;
      events.push({ type: 'wrong', midi });
    }
  }

  /** Keyboard metronome: the first correct key sets where the beat is. */
  private keySync(midi: number, at: number, events: EngineEvent[]): void {
    const start = this.nextGroupStart();
    const state = start === null ? undefined : this.groupAt(start).find((s) => s.note.midi === midi);
    if (!state || start === null) {
      // Nothing has started yet: the key is shown as wrong but does not count.
      events.push({ type: 'wrong', midi });
      return;
    }
    this.pos = start;
    this.lastNow = at;
    this.nextClick = Math.ceil(start - EPS);
    this.syncing = false;
    this.waiting = false;
    this.syncOffsets = [0];
    this.syncShiftMs = 0;
    this.hit(state, 'perfect', 0, events);
  }

  private keyPerform(midi: number, posAt: number, events: EngineEvent[]): void {
    const mpb = this.msPerBeat();
    const win = this.windowMs();
    const offsetOf = (s: NoteState) => (posAt - s.note.start) * mpb;

    // The right key near its note.
    let best: NoteState | null = null;
    for (const s of this.notes) {
      if (!s.played || s.status !== 'pending' || s.note.midi !== midi) continue;
      if (Math.abs(offsetOf(s)) > win) continue;
      if (!best || Math.abs(offsetOf(s)) < Math.abs(offsetOf(best))) best = s;
    }
    if (best) {
      const offsetMs = this.refineBeat(offsetOf(best));
      this.hit(best, gradeFor(offsetMs), offsetMs, events);
      this.timing.push(offsetMs);
      return;
    }

    // The note closest in time decides what this key was: an error on a note that was due,
    // a late correction of a note already marked wrong, or a stray key next to a note already played.
    // In a chord (same time), a note still to play wins over one already played, then the closest in pitch.
    const rank = (s: NoteState) => [Math.abs(offsetOf(s)), s.status === 'pending' ? 0 : 1, Math.abs(s.note.midi - midi)];
    let near: NoteState | null = null;
    for (const s of this.notes) {
      if (!s.played || Math.abs(offsetOf(s)) > win) continue;
      if (!near || isBefore(rank(s), rank(near))) near = s;
    }
    if (near && near.status === 'pending') {
      near.status = 'wrong';
      this.stats.wrong++;
      events.push({ type: 'wrong', midi, instead: near.note.midi });
      return;
    }
    const correction = this.notes.some(
      (s) => s.status === 'wrong' && s.note.midi === midi && Math.abs(offsetOf(s)) <= win,
    );
    if (correction) return;
    if (posAt >= this.startBeat - 0.5) {
      this.stats.extra++;
      events.push({ type: 'wrong', midi });
    }
  }

  /**
   * Keyboard metronome: the first note only gives a rough idea of where the beat is, so the next
   * few notes move it to their average. Returns the offset measured against the refined beat.
   */
  private refineBeat(offsetMs: number): number {
    const n = this.syncOffsets.length;
    if (n === 0 || n >= SYNC_NOTES || Math.abs(offsetMs) > GOOD_MS) return offsetMs;
    const fromFirst = offsetMs + this.syncShiftMs;
    this.syncOffsets.push(fromFirst);
    const mean = this.syncOffsets.reduce((a, b) => a + b, 0) / this.syncOffsets.length;
    this.pos -= (mean - this.syncShiftMs) / this.msPerBeat();
    this.syncShiftMs = mean;
    return fromFirst - mean;
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
    const limit = this.windowMs() / this.msPerBeat();
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
      const overshoot = this.pos - this.endBeat;
      // The click on the last line is also the first beat of the next pass.
      const clicksAhead = Math.max(0, this.nextClick - this.endBeat);
      const sync = { offsets: this.syncOffsets, shift: this.syncShiftMs };
      this.restart();
      this.opts = { ...this.opts, countInBars: countIn };
      this.lastNow = now;
      // Keep the exact time, so the beat stays in step with the keyboard's metronome.
      this.pos = this.startBeat + overshoot;
      this.nextClick = this.startBeat + clicksAhead;
      this.syncing = false;
      this.syncOffsets = sync.offsets;
      this.syncShiftMs = sync.shift;
      events.push({ type: 'loop', lastScore });
    } else {
      this.finished = true;
      events.push({ type: 'finished' });
    }
    this.version++;
  }
}

/** Compares two rankings item by item (times within a microsecond count as equal). */
function isBefore(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > EPS) return a[i] < b[i];
  }
  return false;
}

function emptyStats(total: number): Stats {
  return { total, perfect: 0, good: 0, off: 0, missed: 0, wrong: 0, extra: 0 };
}
