// Turns raw MIDI bytes into the few events the app cares about.

export type MidiEvent =
  | { type: 'noteOn'; midi: number; velocity: number; channel: number }
  | { type: 'noteOff'; midi: number; channel: number }
  | { type: 'sustain'; on: boolean; channel: number };

export function parseMidi(data: ArrayLike<number>): MidiEvent | null {
  if (data.length < 2) return null;
  const status = data[0] & 0xf0;
  const channel = (data[0] & 0x0f) + 1;
  const d1 = data[1];
  const d2 = data.length > 2 ? data[2] : 0;

  if (status === 0x90) {
    // A note-on with velocity 0 is how many keyboards send note-off.
    return d2 > 0
      ? { type: 'noteOn', midi: d1, velocity: d2, channel }
      : { type: 'noteOff', midi: d1, channel };
  }
  if (status === 0x80) return { type: 'noteOff', midi: d1, channel };
  if (status === 0xb0 && d1 === 64) return { type: 'sustain', on: d2 >= 64, channel };
  return null;
}

/**
 * Merges notes that arrive on several channels for one key press
 * (a split/layer on the Fantom sends each zone on its own channel).
 * A key counts as down while any channel holds it.
 */
export class KeyMerger {
  private held = new Map<number, Set<number>>();

  /** Returns true when this is the first channel to press the key. */
  press(midi: number, channel: number): boolean {
    let channels = this.held.get(midi);
    if (!channels) {
      channels = new Set();
      this.held.set(midi, channels);
    }
    const wasUp = channels.size === 0;
    channels.add(channel);
    return wasUp;
  }

  /** Returns true when the last channel holding the key lets go. */
  release(midi: number, channel: number): boolean {
    const channels = this.held.get(midi);
    if (!channels || !channels.has(channel)) return false;
    channels.delete(channel);
    return channels.size === 0;
  }

  reset(): void {
    this.held.clear();
  }
}
