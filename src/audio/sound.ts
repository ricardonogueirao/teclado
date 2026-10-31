// Sounds made by the computer: metronome click and a simple piano-like synth.
// The synth plays the simulator keys and the accompaniment when the Fantom is not the output.

interface Voice {
  gain: GainNode;
  oscs: OscillatorNode[];
}

function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<number, Voice>();

  /** Must run inside a click or key handler the first time (browser rule). */
  unlock(): void {
    const ctx = this.context();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  click(downbeat: boolean): void {
    const ctx = this.context();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = downbeat ? 1760 : 1175;
    gain.gain.setValueAtTime(downbeat ? 0.18 : 0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  noteOn(midi: number, velocity = 90): void {
    this.noteOff(midi);
    const ctx = this.context();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    const peak = 0.05 + (velocity / 127) * 0.17;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    // Piano notes fade even while held.
    gain.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    gain.connect(this.master!);

    const f = freq(midi);
    const oscs = [
      { type: 'triangle' as OscillatorType, mult: 1, level: 1 },
      { type: 'sine' as OscillatorType, mult: 2, level: 0.35 },
      { type: 'sine' as OscillatorType, mult: 3, level: 0.12 },
    ].map(({ type, mult, level }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = f * mult;
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start(t);
      osc.stop(t + 4.1);
      return osc;
    });
    this.voices.set(midi, { gain, oscs });
  }

  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice || !this.ctx) return;
    this.voices.delete(midi);
    const t = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), t);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    voice.oscs.forEach((o) => o.stop(t + 0.3));
  }

  allOff(): void {
    [...this.voices.keys()].forEach((m) => this.noteOff(m));
  }

  private context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }
}

export const sound = new Sound();
