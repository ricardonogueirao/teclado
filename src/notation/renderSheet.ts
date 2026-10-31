// Draws a lesson as sheet music (VexFlow) in one long horizontal line,
// and records where each beat sits so a cursor can follow the music.
import {
  Accidental,
  Annotation,
  Barline,
  Beam,
  Dot,
  Formatter,
  FretHandFinger,
  Modifier,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StaveTie,
  Voice,
} from 'vexflow/bravura';
import { letter, solfege, type NameStyle } from '../music/notes';
import { timeSignature, type Hand, type Song, type SongNote } from '../music/types';
import { buildMeasures, keySpec, noteValue, staffHands, vexKey, type SheetEvent } from './sheetLayout';

export interface SheetGroup {
  el: Element;
  notes: SongNote[];
  cls: string;
}

export interface SheetRender {
  width: number;
  height: number;
  /** Beat -> x (drawing units), sorted by beat. */
  marks: { beat: number; x: number }[];
  groups: SheetGroup[];
  /** Vertical span of the staves, for the cursor. */
  top: number;
  bottom: number;
}

const LEFT = 12;
const RIGHT = 24;
// The gap between the staves leaves room for up to four lines of note names.
const STAVE_Y: Record<number, number> = { 0: 0, 1: 145 };
// Stave(y): the top line is 40 below y and the bottom line 80 below.
const TOP_LINE = 40;
const BOTTOM_LINE = 80;
// Below the bass staff: the left hand's fingers, then up to four lines of note names.
const BOTTOM_ROOM = 86;
const BEAT_PX = 54;
const EVENT_PX = 36;
/** The cursor reaches a bar line this many beats before the bar's first note. */
const BARLINE_LEAD = 0.12;

interface Built {
  stave: Stave;
  hand: Hand;
  notes: StaveNote[];
  events: SheetEvent[];
}

function makeNote(ev: SheetEvent, hand: Hand, beatsPerBar: number, opts: Options): StaveNote {
  const clef = hand === 'R' ? 'treble' : 'bass';
  if (ev.notes.length === 0) {
    const wholeBar = Math.abs(ev.dur - beatsPerBar) < 1e-6;
    const value = wholeBar ? { code: 'w', dots: 0 } : (noteValue(ev.dur) ?? { code: 'q', dots: 0 });
    const rest = new StaveNote({
      keys: [hand === 'R' ? 'b/4' : 'd/3'],
      duration: `${value.code}r`,
      clef,
      align_center: wholeBar,
    });
    if (value.dots) Dot.buildAndAttach([rest], { all: true });
    return rest;
  }

  const value = noteValue(ev.dur) ?? { code: 'q', dots: 0 };
  // The same pitch twice in a chord (doubled in the file) is written once.
  const midis = [...new Set(ev.notes.map((n) => n.midi))].sort((a, b) => a - b);
  const keys = midis.map((m) => vexKey(m, opts.flats));
  const note = new StaveNote({ keys, duration: value.code, clef, auto_stem: true });
  if (value.dots) Dot.buildAndAttach([note], { all: true });
  // A held note continued after a tie gets no name or finger again.
  if (ev.continued) return note;

  // Left-hand fingers go right under the bass staff, above the names (added first, so drawn closest).
  const fingers = fingersTopDown(ev.notes);
  if (hand === 'L' && fingers.length) {
    note.addModifier(
      new Annotation(fingers.join(' '))
        .setFont('Arial', 13, 'bold')
        .setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
      0,
    );
  }

  if (opts.showNames) {
    let lines: string[];
    if (midis.length === 1) {
      const sol = solfege(midis[0], opts.flats);
      const let_ = letter(midis[0], opts.flats);
      lines = opts.nameStyle === 'letters' ? [let_] : opts.nameStyle === 'solfege' ? [sol] : [sol, let_];
    } else {
      // Chords: one name per line, highest note on top, so names never run into each other.
      const name = (m: number) => (opts.nameStyle === 'letters' ? letter(m, opts.flats) : solfege(m, opts.flats));
      lines = [...midis].reverse().slice(0, 4).map(name);
    }
    for (const text of lines) {
      note.addModifier(
        new Annotation(text)
          .setFont('Arial', 11, 'normal')
          .setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
        0,
      );
    }
  }
  // Right-hand fingers above the treble staff, so they never collide with the names between the staves.
  if (hand === 'R' && fingers.length) {
    note.addModifier(new FretHandFinger(fingers.join(' ')).setPosition(Modifier.Position.ABOVE), 0);
  }
  return note;
}

/** Finger numbers of a note or chord, highest note first (as read on the page, top to bottom). */
export function fingersTopDown(notes: SongNote[]): number[] {
  const byKey = new Map<number, number>();
  for (const n of notes) if (n.finger && !byKey.has(n.midi)) byKey.set(n.midi, n.finger);
  const fingers = [...byKey.entries()].sort((a, b) => b[0] - a[0]).map(([, f]) => f);
  // A chord written by hand with one finger for all its notes shows that finger once.
  return fingers.every((f) => f === fingers[0]) ? fingers.slice(0, 1) : fingers;
}

interface Options {
  nameStyle: NameStyle;
  showNames: boolean;
  flats?: boolean;
}

export function renderSheet(host: HTMLElement, song: Song, opts: Options): SheetRender {
  host.innerHTML = '';
  const measures = buildMeasures(song);
  const hands = staffHands(song);
  const bpb = song.beatsPerBar;
  const last = measures.length - 1;
  const [tsNum, tsDen] = timeSignature(song);
  const key = keySpec(song.keyFifths ?? 0);
  const noteOpts: Options = { ...opts, flats: (song.keyFifths ?? 0) < 0 };

  // Pass 1: build staves and notes, and work out each bar's width.
  let x = LEFT;
  const bars = measures.map((m, i) => {
    const built: Built[] = hands.map((hand, row) => {
      const stave = new Stave(x, STAVE_Y[row], 100);
      if (i === 0) {
        stave.addClef(hand === 'R' ? 'treble' : 'bass');
        if (key !== 'C') stave.addKeySignature(key);
        stave.addTimeSignature(`${tsNum}/${tsDen}`);
      }
      if (i === last) stave.setEndBarType(Barline.type.END);
      const events = m.staves[hand] ?? [];
      return { stave, hand, events, notes: events.map((ev) => makeNote(ev, hand, bpb, noteOpts)) };
    });
    const staves = built.map((b) => b.stave);
    if (i === 0 && staves.length > 1) Stave.formatBegModifiers(staves);
    const lead = Math.max(...staves.map((s) => s.getNoteStartX() - s.getX()));
    const events = Math.max(...built.map((b) => b.events.length));
    const width = lead + Math.max(m.beats * BEAT_PX, events * EVENT_PX) + 18;
    staves.forEach((s) => s.setX(x).setWidth(width));
    x += width;
    return { m, built, width };
  });

  const width = x + RIGHT;
  const bottomStave = STAVE_Y[hands.length - 1];
  const height = bottomStave + BOTTOM_LINE + BOTTOM_ROOM;
  const renderer = new Renderer(host as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  // Pass 2: draw, then read back where everything landed.
  const marks: { beat: number; x: number }[] = [];
  const pending: { note: StaveNote; notes: SongNote[] }[] = [];
  // Notes in play order per hand, to draw the ties once everything is placed.
  const sequence: Record<string, { note: StaveNote; ev: SheetEvent }[]> = {};

  bars.forEach(({ m, built }, i) => {
    built.forEach((b) => b.stave.setContext(ctx).draw());
    if (built.length === 2) {
      const [top, bottom] = [built[0].stave, built[1].stave];
      if (i === 0) {
        new StaveConnector(top, bottom).setType('brace').setContext(ctx).draw();
        new StaveConnector(top, bottom).setType('singleLeft').setContext(ctx).draw();
      }
      new StaveConnector(top, bottom).setType(i === last ? 'boldDoubleRight' : 'singleRight').setContext(ctx).draw();
    }

    const beams: Beam[] = [];
    const voices = built.map((b) => {
      b.notes.forEach((n) => n.setStave(b.stave));
      beams.push(...Beam.generateBeams(b.notes));
      const voice = new Voice({ num_beats: tsNum, beat_value: tsDen }).setMode(Voice.Mode.SOFT).addTickables(b.notes);
      // Sharps, flats and naturals as the key signature requires, bar by bar.
      Accidental.applyAccidentals([voice], key);
      return voice;
    });
    const formatter = new Formatter();
    voices.forEach((v) => formatter.joinVoices([v]));
    formatter.formatToStave(voices, built[0].stave);
    voices.forEach((v, k) => v.draw(ctx, built[k].stave));
    beams.forEach((beam) => beam.setContext(ctx).draw());

    if (i > 0) marks.push({ beat: m.start - BARLINE_LEAD, x: built[0].stave.getX() });
    built.forEach((b) =>
      b.notes.forEach((n, k) => {
        const ev = b.events[k];
        const center = n.getAbsoluteX() + n.getGlyphWidth() / 2;
        marks.push({ beat: ev.start, x: center });
        if (ev.notes.length) {
          pending.push({ note: n, notes: ev.notes });
          (sequence[b.hand] ??= []).push({ note: n, ev });
        }
      }),
    );
    if (i === last) {
      const s = built[0].stave;
      marks.push({ beat: m.start + m.beats, x: s.getX() + s.getWidth() });
    }
  });

  for (const list of Object.values(sequence)) {
    list.forEach(({ note, ev }, k) => {
      const next = list[k + 1];
      if (!ev.tied || !next) return;
      const indices = note.getKeys().map((_, idx) => idx);
      new StaveTie({ first_note: note, last_note: next.note, first_indices: indices, last_indices: indices })
        .setContext(ctx)
        .draw();
    });
  }

  // One mark per beat; notes in both staves at the same beat share an x.
  marks.sort((a, b) => a.beat - b.beat || a.x - b.x);
  const unique = marks.filter((mk, i) => i === 0 || Math.abs(mk.beat - marks[i - 1].beat) > 1e-6);

  const groups: SheetGroup[] = [];
  for (const p of pending) {
    const el = p.note.getSVGElement();
    if (el) groups.push({ el, notes: p.notes, cls: '' });
  }

  return {
    width,
    height,
    marks: unique,
    groups,
    top: TOP_LINE - 18,
    bottom: bottomStave + BOTTOM_LINE + 14,
  };
}

/** x for a beat, between the two nearest marks. */
export function xAtBeat(marks: { beat: number; x: number }[], beat: number): number {
  if (marks.length === 0) return 0;
  if (beat <= marks[0].beat) return marks[0].x;
  const lastMark = marks[marks.length - 1];
  if (beat >= lastMark.beat) return lastMark.x;
  let lo = 0;
  let hi = marks.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (marks[mid].beat <= beat) lo = mid;
    else hi = mid;
  }
  const a = marks[lo];
  const b = marks[hi];
  return a.x + ((beat - a.beat) / (b.beat - a.beat)) * (b.x - a.x);
}
