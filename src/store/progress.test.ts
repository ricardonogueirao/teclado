import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, migrateSettings } from './progress';

describe('saved settings', () => {
  it('turns the old metronome on/off into who keeps the beat', () => {
    expect(migrateSettings({ metronome: true as never }).metronome).toBe('keyboard');
    expect(migrateSettings({ metronome: false as never }).metronome).toBe('off');
    expect(migrateSettings({ metronome: 'app' }).metronome).toBe('app');
  });

  it('opens lessons with the music flowing unless another mode was chosen', () => {
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.mode).toBe('perform');
    expect(migrateSettings({ mode: 'wait' }).mode).toBe('wait');
    expect(migrateSettings({ mode: 'nonsense' as never }).mode).toBe('perform');
  });
});
