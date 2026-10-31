// Progress and settings, saved in this browser on this Mac (no account, no server).
import type { MetronomeSource, Mode } from '../engine/practice';
import type { NameStyle } from '../music/notes';
import type { ViewMode } from '../music/types';

export interface LessonProgress {
  bestScore: number;
  stars: number;
  plays: number;
  lastPlayed: string;
}

export interface Settings {
  nameStyle: NameStyle;
  showNamesOnKeys: boolean;
  /** Who keeps the beat: the Roland's own metronome, the app, or nobody. */
  metronome: MetronomeSource;
  /** Practice mode a lesson opens in (the last one chosen). */
  mode: Mode;
  /** View for lessons that do not ask for one. */
  view: ViewMode;
  showNamesOnSheet: boolean;
}

export interface SavedState {
  lessons: Record<string, LessonProgress>;
  practiceDays: string[];
  settings: Settings;
}

const KEY = 'teclado:v1';
export const DEFAULT_SETTINGS: Settings = {
  nameStyle: 'both',
  showNamesOnKeys: true,
  metronome: 'keyboard',
  mode: 'perform',
  view: 'both',
  showNamesOnSheet: true,
};

function empty(): SavedState {
  return { lessons: {}, practiceDays: [], settings: { ...DEFAULT_SETTINGS } };
}

export function load(): SavedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<SavedState>;
    return {
      lessons: data.lessons ?? {},
      practiceDays: data.practiceDays ?? [],
      settings: migrateSettings(data.settings),
    };
  } catch {
    return empty();
  }
}

/** Fills in missing settings and updates ones saved by older versions. */
export function migrateSettings(saved: Partial<Settings> | undefined): Settings {
  const settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  // Before: a plain on/off. "On" now means the Roland's metronome, which is how the lessons are played.
  const old = settings.metronome as unknown;
  if (typeof old === 'boolean') settings.metronome = old ? 'keyboard' : 'off';
  if (!['keyboard', 'app', 'off'].includes(settings.metronome)) settings.metronome = DEFAULT_SETTINGS.metronome;
  if (!['wait', 'perform', 'listen'].includes(settings.mode)) settings.mode = DEFAULT_SETTINGS.mode;
  return settings;
}

export function save(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private window): progress just isn't kept.
  }
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function recordResult(state: SavedState, lessonId: string, score: number, stars: number): SavedState {
  const prev = state.lessons[lessonId];
  const day = today();
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId]: {
        bestScore: Math.max(prev?.bestScore ?? 0, score),
        stars: Math.max(prev?.stars ?? 0, stars),
        plays: (prev?.plays ?? 0) + 1,
        lastPlayed: day,
      },
    },
    practiceDays: state.practiceDays.includes(day) ? state.practiceDays : [...state.practiceDays, day].slice(-400),
  };
}

/** Days in a row with practice, ending today or yesterday. */
export function streak(days: string[], now = new Date()): number {
  const set = new Set(days);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const key = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!set.has(key(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (set.has(key(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
