// Simulator: play with the computer keyboard when the Fantom is not connected.
// Row "A S D F G H J K L Ç" = white keys, row "W E T Y U O P" = black keys,
// Z / X move one octave down / up.
import { midi as connection } from './midiConnection';

const CODE_TO_SEMITONE: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7,
  KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16,
};

let baseNote = 60; // Dó central
const down = new Map<string, number>();

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
  if (e.code === 'KeyZ' || e.code === 'KeyX') {
    if (!e.repeat) baseNote = Math.min(84, Math.max(36, baseNote + (e.code === 'KeyZ' ? -12 : 12)));
    return;
  }
  const semitone = CODE_TO_SEMITONE[e.code];
  if (semitone === undefined) return;
  e.preventDefault();
  if (e.repeat || down.has(e.code)) return;
  const note = baseNote + semitone;
  down.set(e.code, note);
  connection.emitKey({ type: 'down', midi: note, velocity: 90, source: 'computer', at: performance.now() });
}

function onKeyUp(e: KeyboardEvent): void {
  const note = down.get(e.code);
  if (note === undefined) return;
  down.delete(e.code);
  connection.emitKey({ type: 'up', midi: note, velocity: 0, source: 'computer', at: performance.now() });
}

function releaseAll(): void {
  down.forEach((note) =>
    connection.emitKey({ type: 'up', midi: note, velocity: 0, source: 'computer', at: performance.now() }),
  );
  down.clear();
}

export function installComputerKeyboard(): () => void {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseAll);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', releaseAll);
  };
}
