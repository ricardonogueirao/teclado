import { useEffect, useRef } from 'react';
import type { PracticeEngine } from '../engine/practice';
import { solfege, letter, type NameStyle } from '../music/notes';
import type { KeyRect } from './keyboardLayout';

export interface Popup {
  text: string;
  x: number;
  color: string;
  at: number;
}

interface Props {
  engineRef: React.MutableRefObject<PracticeEngine | null>;
  popupsRef: React.MutableRefObject<Popup[]>;
  rects: Map<number, KeyRect>;
  width: number;
  height: number;
  nameStyle: NameStyle;
  /** Name black keys with flats (songs in flat keys). */
  flats?: boolean;
}

/** How far ahead the player sees, in real time. Notes fall at the same speed at any tempo. */
const LOOKAHEAD_MS = 3000;
const POPUP_MS = 800;

export const COLORS = {
  right: '#4f9cf9',
  left: '#f5a524',
  auto: 'rgba(170, 170, 200, 0.28)',
  hit: '#34d399',
  miss: '#f87171',
  line: '#e7e9f0',
  wait: '#fde047',
};

function label(midi: number, style: NameStyle, flats: boolean): string {
  return style === 'letters' ? letter(midi, flats) : solfege(midi, flats);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function FallingNotes({ engineRef, popupsRef, rects, width, height, nameStyle, flats = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const engine = engineRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Lanes: a faint line at every C, darker strips over black keys.
      for (const r of rects.values()) {
        if (r.black) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(r.x, 0, r.w, height);
        } else if (r.midi % 12 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(r.x, 0, 1, height);
        }
      }
      if (!engine) return;

      const mpb = engine.msPerBeat();
      const ppb = (height * mpb) / LOOKAHEAD_MS;
      const pos = engine.pos;
      const yOf = (beat: number) => height - (beat - pos) * ppb;

      // Bar lines with bar numbers.
      const bpb = engine.song.beatsPerBar;
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      for (let b = Math.floor(pos / bpb) * bpb; yOf(b) > -20; b += bpb) {
        if (b < engine.startBeat || b > engine.endBeat) continue;
        const y = yOf(b);
        if (y > height) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(0, y, width, 1);
        if (b < engine.endBeat) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillText(`${b / bpb + 1}`, 6, y - 4);
        }
      }

      // Notes.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const s of engine.notes) {
        const r = rects.get(s.note.midi);
        if (!r) continue;
        const bottom = yOf(s.note.start);
        const top = yOf(s.note.start + s.note.dur);
        if (bottom < 0 || top > height) continue;
        const pad = r.black ? 1 : 2;
        const x = r.x + pad;
        const w = r.w - pad * 2;
        const h = Math.max(4, bottom - top - 2);

        let fill: string;
        if (s.status === 'hit') fill = COLORS.hit;
        else if (s.status === 'missed') fill = COLORS.miss;
        else if (s.status === 'auto') fill = COLORS.auto;
        else fill = s.note.hand === 'R' ? COLORS.right : COLORS.left;

        ctx.globalAlpha = s.status === 'missed' ? 0.55 : 1;
        ctx.fillStyle = fill;
        roundRect(ctx, x, top + 1, w, h, 5);
        ctx.fill();
        if (s.status === 'auto') {
          ctx.strokeStyle = 'rgba(200,200,230,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        if (h >= 18 && w >= 14 && s.status !== 'auto') {
          ctx.fillStyle = 'rgba(10,12,20,0.85)';
          ctx.font = `600 ${Math.min(13, w * 0.42)}px system-ui, sans-serif`;
          ctx.fillText(label(s.note.midi, nameStyle, flats), x + w / 2, top + h - 5);
          if (s.note.finger && h >= 38) {
            ctx.font = '600 11px system-ui, sans-serif';
            ctx.fillText(String(s.note.finger), x + w / 2, top + 15);
          }
        }
      }

      // Hit line: where the notes must be played.
      ctx.fillStyle = engine.waiting ? COLORS.wait : COLORS.line;
      ctx.globalAlpha = engine.waiting ? 0.9 : 0.5;
      ctx.fillRect(0, height - 3, width, 3);
      ctx.globalAlpha = 1;

      // Count-in.
      if (pos < engine.startBeat) {
        const left = Math.ceil(engine.startBeat - pos - 1e-6);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '700 64px system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(left), width / 2, height / 2);
        ctx.font = '500 16px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Prepare-se', width / 2, height / 2 + 46);
        ctx.textBaseline = 'alphabetic';
      }

      // Feedback popups rising from the hit line.
      const now = performance.now();
      popupsRef.current = popupsRef.current.filter((p) => now - p.at < POPUP_MS);
      ctx.font = '700 15px system-ui, sans-serif';
      for (const p of popupsRef.current) {
        const t = (now - p.at) / POPUP_MS;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, Math.min(width - 40, Math.max(40, p.x)), height - 14 - t * 40);
      }
      ctx.globalAlpha = 1;
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [engineRef, popupsRef, rects, width, height, nameStyle, flats]);

  return <canvas ref={canvasRef} className="falling" style={{ width, height }} />;
}
