// Connection to the keyboard through the browser's Web MIDI API (Chrome/Edge).
import { KeyMerger, parseMidi, type MidiEvent } from './parseMidi';

export type InputSource = 'midi' | 'computer';

export interface KeyEvent {
  type: 'down' | 'up';
  midi: number;
  velocity: number;
  source: InputSource;
  /** performance.now() when the event arrived. */
  at: number;
}

export interface PortInfo {
  id: string;
  name: string;
}

export interface RawLogEntry {
  at: number;
  port: string;
  event: MidiEvent;
}

export type MidiStatus = 'idle' | 'connecting' | 'unsupported' | 'denied' | 'ready';

export const AUTO = 'auto';
export const NO_OUTPUT = 'none';

// The Fantom shows a second port for DAW control; key presses do not come from it.
const CONTROL_PORT = /daw|ctrl|control/i;
const PREFERRED_OUTPUT = /fantom|roland/i;
// If a note we just sent to the keyboard comes back this fast, it is an echo, not a key press.
const ECHO_WINDOW_MS = 60;

export class MidiConnection {
  status: MidiStatus = 'idle';
  inputs: PortInfo[] = [];
  outputs: PortInfo[] = [];
  inputChoice: string = AUTO;
  outputChoice: string = AUTO;
  log: RawLogEntry[] = [];

  private access: MIDIAccess | null = null;
  private merger = new KeyMerger();
  private sentAt = new Map<number, number>();
  private keyListeners = new Set<(e: KeyEvent) => void>();
  private changeListeners = new Set<() => void>();

  get supported(): boolean {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  onKey(fn: (e: KeyEvent) => void): () => void {
    this.keyListeners.add(fn);
    return () => this.keyListeners.delete(fn);
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  async connect(): Promise<void> {
    if (!this.supported) {
      this.setStatus('unsupported');
      return;
    }
    if (this.status === 'ready' || this.status === 'connecting') return;
    this.setStatus('connecting');
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      this.setStatus('denied');
      return;
    }
    this.access.onstatechange = () => this.refreshPorts();
    this.refreshPorts();
    this.setStatus('ready');
  }

  setInput(choice: string): void {
    this.inputChoice = choice;
    this.refreshPorts();
  }

  setOutput(choice: string): void {
    this.allNotesOff();
    this.outputChoice = choice;
    this.emitChange();
  }

  /** Inputs the app is listening to right now. */
  activeInputs(): PortInfo[] {
    if (this.inputChoice === AUTO) return this.inputs.filter((p) => !CONTROL_PORT.test(p.name));
    return this.inputs.filter((p) => p.id === this.inputChoice);
  }

  /** Output that receives the accompaniment, or null to use the computer's sound. */
  activeOutput(): PortInfo | null {
    if (this.outputChoice === NO_OUTPUT) return null;
    if (this.outputChoice === AUTO) {
      return this.outputs.find((p) => PREFERRED_OUTPUT.test(p.name) && !CONTROL_PORT.test(p.name)) ?? null;
    }
    return this.outputs.find((p) => p.id === this.outputChoice) ?? null;
  }

  /** True when a MIDI keyboard is connected and being listened to. */
  hasKeyboard(): boolean {
    return this.status === 'ready' && this.activeInputs().length > 0;
  }

  sendNoteOn(midi: number, velocity: number, channel = 1): void {
    const out = this.outputPort();
    if (!out) return;
    this.sentAt.set(midi, performance.now());
    out.send([0x90 | (channel - 1), midi, velocity]);
  }

  sendNoteOff(midi: number, channel = 1): void {
    this.outputPort()?.send([0x80 | (channel - 1), midi, 0]);
  }

  allNotesOff(channel = 1): void {
    // Controller 123 = "all notes off".
    this.outputPort()?.send([0xb0 | (channel - 1), 123, 0]);
  }

  /** Feeds a key press from the on-screen or computer keyboard. */
  emitKey(e: KeyEvent): void {
    this.keyListeners.forEach((fn) => fn(e));
  }

  private outputPort(): MIDIOutput | null {
    const info = this.activeOutput();
    if (!info || !this.access) return null;
    return this.access.outputs.get(info.id) ?? null;
  }

  private refreshPorts(): void {
    if (!this.access) return;
    const inputs: PortInfo[] = [];
    this.access.inputs.forEach((p) => inputs.push({ id: p.id, name: p.name ?? 'Entrada MIDI' }));
    const outputs: PortInfo[] = [];
    this.access.outputs.forEach((p) => outputs.push({ id: p.id, name: p.name ?? 'Saída MIDI' }));
    this.inputs = inputs;
    this.outputs = outputs;

    const listening = new Set(this.activeInputs().map((p) => p.id));
    this.access.inputs.forEach((port) => {
      port.onmidimessage = listening.has(port.id)
        ? (msg: MIDIMessageEvent) => this.handleMessage(port.name ?? '', msg)
        : null;
    });
    this.merger.reset();
    this.emitChange();
  }

  private handleMessage(portName: string, msg: MIDIMessageEvent): void {
    if (!msg.data) return;
    const event = parseMidi(msg.data);
    if (!event) return;
    const at = performance.now();
    this.log = [{ at, port: portName, event }, ...this.log].slice(0, 12);

    if (event.type === 'noteOn') {
      const sent = this.sentAt.get(event.midi);
      if (sent !== undefined && at - sent < ECHO_WINDOW_MS) return;
      if (this.merger.press(event.midi, event.channel)) {
        this.emitKey({ type: 'down', midi: event.midi, velocity: event.velocity, source: 'midi', at });
      }
    } else if (event.type === 'noteOff') {
      if (this.merger.release(event.midi, event.channel)) {
        this.emitKey({ type: 'up', midi: event.midi, velocity: 0, source: 'midi', at });
      }
    }
    this.emitChange();
  }

  private setStatus(status: MidiStatus): void {
    this.status = status;
    this.emitChange();
  }

  private emitChange(): void {
    this.changeListeners.forEach((fn) => fn());
  }
}

export const midi = new MidiConnection();
