import { useEffect, useState } from 'react';
import { midi } from '../midi/midiConnection';

/** Re-renders the component whenever the MIDI connection changes. */
export function useMidi() {
  const [, setVersion] = useState(0);
  useEffect(() => midi.onChange(() => setVersion((v) => v + 1)), []);
  return midi;
}
