import { useEffect, useRef, useState } from 'react';
import type { NoteState, PracticeEngine } from '../engine/practice';
import type { NameStyle } from '../music/notes';
import type { Song, SongNote } from '../music/types';
import { renderSheet, xAtBeat, type SheetRender } from '../notation/renderSheet';

interface Props {
  song: Song;
  engineRef: React.MutableRefObject<PracticeEngine | null>;
  width: number;
  height: number;
  nameStyle: NameStyle;
  showNames: boolean;
}

/** Where the cursor rests on screen once the music starts scrolling (fraction of the width). */
const ANCHOR = 0.3;

/** Colour class for a note (or chord) on the sheet, from what the engine says about it. */
function classFor(notes: SongNote[], states: Map<SongNote, NoteState>, expected: Set<SongNote>): string {
  const sts = notes.map((n) => states.get(n)).filter((s): s is NoteState => !!s);
  if (sts.length === 0) return 'out';
  if (sts.some((s) => s.status === 'missed' || s.status === 'wrong')) return 'miss';
  if (sts.every((s) => s.status === 'hit')) return 'hit';
  if (sts.every((s) => s.status === 'auto')) return sts.some((s) => s.sounding) ? 'auto playing' : 'auto';
  if (notes.some((n) => expected.has(n))) return 'now';
  return '';
}

export function SheetMusic({ song, engineRef, width, height, nameStyle, showNames }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const renderRef = useRef<SheetRender | null>(null);
  const [scale, setScale] = useState(1);

  // Draw the whole lesson once (again only if the lesson or the name option changes).
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    renderRef.current = renderSheet(strip, song, { nameStyle, showNames });
  }, [song, nameStyle, showNames]);

  // Fit the staves to the available height.
  useEffect(() => {
    const r = renderRef.current;
    const svg = stripRef.current?.querySelector('svg');
    if (!r || !svg || height === 0) return;
    const s = Math.max(0.7, Math.min(1.6, (height - 16) / r.height));
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    svg.setAttribute('width', String(r.width * s));
    svg.setAttribute('height', String(r.height * s));
    svg.style.width = `${r.width * s}px`;
    svg.style.height = `${r.height * s}px`;
    setScale(s);
  }, [height, song, nameStyle, showNames]);

  // Follow the music every frame.
  useEffect(() => {
    let frame = 0;
    // Recolouring hundreds of notes is only needed when the engine or the expected notes change.
    let lastEngine: PracticeEngine | null = null;
    let lastVersion = -1;
    let lastExpected: SongNote[] = [];
    let lastRender: SheetRender | null = null;
    let states = new Map<SongNote, NoteState>();
    const step = () => {
      frame = requestAnimationFrame(step);
      const r = renderRef.current;
      const strip = stripRef.current;
      const cursor = cursorRef.current;
      if (!r || !strip || !cursor) return;
      const engine = engineRef.current;
      const beat = engine ? Math.max(engine.startBeat, Math.min(engine.endBeat, engine.pos)) : 0;
      const x = xAtBeat(r.marks, beat) * scale;
      const minShift = Math.min(0, width - r.width * scale);
      const shift = Math.max(minShift, Math.min(0, width * ANCHOR - x));
      strip.style.transform = `translateX(${shift}px)`;
      cursor.style.transform = `translateX(${x + shift - 2}px)`;
      cursor.classList.toggle('is-waiting', !!engine?.waiting);

      if (!engine) return;
      const expectedList = engine.expectedNotes();
      const sameExpected =
        expectedList.length === lastExpected.length && expectedList.every((n, i) => n === lastExpected[i]);
      if (engine === lastEngine && engine.version === lastVersion && sameExpected && r === lastRender) return;
      if (engine !== lastEngine || engine.version !== lastVersion) states = new Map(engine.notes.map((s) => [s.note, s]));
      lastEngine = engine;
      lastVersion = engine.version;
      lastExpected = expectedList;
      lastRender = r;
      const expected = new Set(expectedList);
      for (const g of r.groups) {
        const cls = classFor(g.notes, states, expected);
        if (cls !== g.cls) {
          if (g.cls) g.el.classList.remove(...g.cls.split(' '));
          if (cls) g.el.classList.add(...cls.split(' '));
          g.cls = cls;
        }
      }
    };
    step();
    return () => cancelAnimationFrame(frame);
  }, [engineRef, width, scale]);

  const r = renderRef.current;
  const top = r ? Math.max(8, (height - r.height * scale) / 2) : 8;

  return (
    <div className="sheet" style={{ width, height }}>
      <div className="sheet-strip" ref={stripRef} style={{ top }} />
      <div
        className="sheet-cursor"
        ref={cursorRef}
        style={r ? { top: top + r.top * scale, height: (r.bottom - r.top) * scale } : { display: 'none' }}
      />
    </div>
  );
}
