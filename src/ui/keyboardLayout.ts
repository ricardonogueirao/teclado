// Where each key sits on screen. Shared by the keyboard and the falling notes so they line up.
import { isBlack, type KeyRange } from '../music/notes';

export interface KeyRect {
  midi: number;
  x: number;
  w: number;
  black: boolean;
}

// Black keys are not centred between white keys on a real piano.
const BLACK_SHIFT: Record<number, number> = { 1: -0.12, 3: 0.12, 6: -0.15, 8: 0, 10: 0.15 };
export const BLACK_WIDTH = 0.6;

export function keyLayout(range: KeyRange, width: number): Map<number, KeyRect> {
  let whites = 0;
  for (let m = range.low; m <= range.high; m++) if (!isBlack(m)) whites++;
  const ww = width / whites;
  const bw = ww * BLACK_WIDTH;
  const rects = new Map<number, KeyRect>();
  let i = 0;
  for (let m = range.low; m <= range.high; m++) {
    if (isBlack(m)) {
      const shift = BLACK_SHIFT[m % 12] ?? 0;
      rects.set(m, { midi: m, x: i * ww - bw / 2 + shift * bw, w: bw, black: true });
    } else {
      rects.set(m, { midi: m, x: i * ww, w: ww, black: false });
      i++;
    }
  }
  return rects;
}
