// Shows how early or late the last notes were, as dots on a ruler (early on the left, late on the right).
import { GOOD_MS, PERFECT_MS, type Grade } from '../engine/practice';

export type Judgement = { kind: Grade; offsetMs: number } | { kind: 'miss' } | { kind: 'wrong' };

/** The ruler goes from this many ms early to this many ms late. */
const RANGE_MS = 300;
const SHOWN = 12;

/** "Perfeito", "Atrasado 85 ms", "Muito adiantado 210 ms". Short form for the popups. */
export function timingLabel(grade: Grade, offsetMs: number, short = false): string {
  const ms = Math.round(Math.abs(offsetMs));
  if (grade === 'perfect') return short ? 'Perfeito' : `Perfeito · ${signed(offsetMs)}`;
  const dir = offsetMs < 0 ? 'adiantado' : 'atrasado';
  return grade === 'good' ? `${dir[0].toUpperCase()}${dir.slice(1)} ${ms} ms` : `Muito ${dir} ${ms} ms`;
}

function signed(offsetMs: number): string {
  const ms = Math.round(offsetMs);
  return ms === 0 ? '0 ms' : `${ms > 0 ? '+' : '−'}${Math.abs(ms)} ms`;
}

function lastText(last: Judgement | null): { text: string; cls: string } {
  if (!last) return { text: 'Toque no tempo', cls: '' };
  if (last.kind === 'miss') return { text: 'Perdeu a nota', cls: 'bad' };
  if (last.kind === 'wrong') return { text: 'Tecla errada', cls: 'bad' };
  return { text: timingLabel(last.kind, last.offsetMs), cls: last.kind };
}

export function TimingMeter({ timing, last }: { timing: number[]; last: Judgement | null }) {
  const pct = (ms: number) => 50 + (Math.max(-RANGE_MS, Math.min(RANGE_MS, ms)) / RANGE_MS) * 50;
  const recent = timing.slice(-SHOWN);
  const { text, cls } = lastText(last);
  return (
    <div className="timing" title="Cada ponto é uma nota: à esquerda adiantada, à direita atrasada">
      <div className="timing-ruler" aria-hidden>
        <span className="timing-zone good" style={{ left: `${pct(-GOOD_MS)}%`, right: `${100 - pct(GOOD_MS)}%` }} />
        <span className="timing-zone perfect" style={{ left: `${pct(-PERFECT_MS)}%`, right: `${100 - pct(PERFECT_MS)}%` }} />
        <span className="timing-center" />
        {recent.map((ms, i) => (
          <i
            key={timing.length - recent.length + i}
            className={i === recent.length - 1 ? 'latest' : ''}
            style={{ left: `${pct(ms)}%`, opacity: 0.3 + (0.7 * (i + 1)) / recent.length }}
          />
        ))}
      </div>
      <div className="timing-labels">
        <span>adiantado</span>
        <b className={cls}>{text}</b>
        <span>atrasado</span>
      </div>
    </div>
  );
}
