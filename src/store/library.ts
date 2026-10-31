// Songs the user imported, saved in this browser (nothing is uploaded anywhere).
import type { Song } from '../music/types';

export interface LibrarySong extends Song {
  fileName: string;
  importedAt: string;
}

const KEY = 'teclado:songs:v1';

export function loadLibrary(): LibrarySong[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as LibrarySong[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refuses (storage full or blocked). */
export function saveLibrary(list: LibrarySong[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function newSongId(): string {
  return `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
