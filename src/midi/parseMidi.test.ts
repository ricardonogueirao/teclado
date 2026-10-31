import { describe, expect, it } from 'vitest';
import { KeyMerger, parseMidi } from './parseMidi';

describe('parseMidi', () => {
  it('reads note-on with channel', () => {
    expect(parseMidi([0x91, 60, 100])).toEqual({ type: 'noteOn', midi: 60, velocity: 100, channel: 2 });
  });
  it('treats note-on with velocity 0 as note-off', () => {
    expect(parseMidi([0x90, 60, 0])).toEqual({ type: 'noteOff', midi: 60, channel: 1 });
  });
  it('reads note-off and the sustain pedal', () => {
    expect(parseMidi([0x80, 61, 64])).toEqual({ type: 'noteOff', midi: 61, channel: 1 });
    expect(parseMidi([0xb0, 64, 127])).toEqual({ type: 'sustain', on: true, channel: 1 });
  });
  it('ignores clock and other messages', () => {
    expect(parseMidi([0xf8])).toBeNull();
    expect(parseMidi([0xb0, 7, 100])).toBeNull();
  });
});

describe('KeyMerger', () => {
  it('reports one press for a key sent on two channels (layer)', () => {
    const m = new KeyMerger();
    expect(m.press(60, 1)).toBe(true);
    expect(m.press(60, 2)).toBe(false);
    expect(m.release(60, 1)).toBe(false);
    expect(m.release(60, 2)).toBe(true);
  });
  it('ignores a release for a key never pressed', () => {
    expect(new KeyMerger().release(60, 1)).toBe(false);
  });
});
