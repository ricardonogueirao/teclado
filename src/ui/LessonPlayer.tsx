import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import {
  PracticeEngine,
  scoreOf,
  starsFor,
  type EngineEvent,
  type Grade,
  type HandsChoice,
  type MetronomeSource,
  type Mode,
  type Stats,
} from '../engine/practice';
import { midi, type KeyEvent } from '../midi/midiConnection';
import { FANTOM_6_RANGE, noteLabel } from '../music/notes';
import { hasHand, songBpm, songLengthBeats, tempoLabel, timeSignature, type Song, type ViewMode } from '../music/types';
import { recordResult, save, type SavedState, type Settings } from '../store/progress';
import { COLORS, FallingNotes, type Popup } from './FallingNotes';
import { Keyboard, type KeyState } from './Keyboard';
import { keyLayout } from './keyboardLayout';
import { SheetMusic } from './SheetMusic';
import { TimingMeter, timingLabel, type Judgement } from './TimingMeter';
import { METRONOME_OPTIONS, Segmented, Stars } from './widgets';
import { useSize } from './useSize';

type Phase = 'ready' | 'playing' | 'paused' | 'done';

interface Result {
  score: number;
  stars: number;
  stats: Stats;
  /** Timing of each note played, in ms (performance mode). */
  timing: number[];
  counted: boolean;
  newBest: boolean;
}

interface Props {
  song: Song;
  nextLessonId: string | null;
  state: SavedState;
  setState: (s: SavedState) => void;
  onExit: () => void;
  onOpenLesson: (id: string) => void;
}

const RANGE = FANTOM_6_RANGE;
const KEYBOARD_HEIGHT = 150;
const ACC_VELOCITY = 72;

export function LessonPlayer({ song, nextLessonId, state, setState, onExit, onOpenLesson }: Props) {
  const twoHands = hasHand(song, 'R') && hasHand(song, 'L');
  const flats = (song.keyFifths ?? 0) < 0;
  const bars = songLengthBeats(song) / song.beatsPerBar;
  const settings = state.settings;

  const baseBpm = songBpm(song);
  const minBpm = Math.max(20, Math.round(baseBpm * 0.4));
  const maxBpm = Math.max(baseBpm, Math.round(baseBpm * 1.2));
  const [timeNum, timeDen] = timeSignature(song);

  const [mode, setMode] = useState<Mode>(settings.mode === 'listen' ? 'perform' : settings.mode);
  const [hands, setHands] = useState<HandsChoice>('both');
  // Whole beats per minute, so the same number can be set on the Roland's metronome.
  const [bpm, setBpm] = useState(baseBpm);
  const tempo = bpm / song.bpm;
  const [metronome, setMetronome] = useState<MetronomeSource>(settings.metronome);
  const roland = metronome === 'keyboard';
  const [view, setView] = useState<ViewMode>(song.view ?? settings.view);
  const [loopOn, setLoopOn] = useState(false);
  const [loopFrom, setLoopFrom] = useState(1);
  const [loopTo, setLoopTo] = useState(Math.min(2, bars));
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<Result | null>(null);
  const [loopInfo, setLoopInfo] = useState<{ passes: number; lastScore: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, setVersion] = useState(0);

  const engineRef = useRef<PracticeEngine | null>(null);
  const popupsRef = useRef<Popup[]>([]);
  const lastJudgeRef = useRef<Judgement | null>(null);
  const pressedRef = useRef(new Map<number, KeyState>());
  const phaseRef = useRef<Phase>('ready');
  const frameRef = useRef(0);
  const lastVersion = useRef(-1);
  const stateRef = useRef(state);
  stateRef.current = state;

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...stateRef.current, settings: { ...stateRef.current.settings, ...patch } };
    save(next);
    setState(next);
  };

  const [stageRef, stage] = useSize<HTMLDivElement>();
  const rects = useMemo(() => keyLayout(RANGE, stage.width), [stage.width]);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // --- Accompaniment goes to the Fantom when it is connected, otherwise to the computer.
  const accOn = (m: number) => {
    if (midi.activeOutput()) midi.sendNoteOn(m, ACC_VELOCITY);
    else sound.noteOn(m, ACC_VELOCITY);
  };
  const accOff = (m: number) => {
    if (midi.activeOutput()) midi.sendNoteOff(m);
    sound.noteOff(m);
  };

  const popupAt = (m: number, text: string, color: string) => {
    const r = rects.get(m);
    const x = r ? r.x + r.w / 2 : stage.width / 2;
    popupsRef.current.push({ text, x, color, at: performance.now() });
  };

  const handleEvents = (events: EngineEvent[]) => {
    for (const ev of events) {
      switch (ev.type) {
        case 'click':
          sound.click(ev.downbeat, ev.at);
          break;
        case 'accOn':
          accOn(ev.midi);
          break;
        case 'accOff':
          accOff(ev.midi);
          break;
        case 'judged':
          if (ev.result === 'miss') {
            popupAt(ev.midi, 'Perdeu', COLORS.miss);
            lastJudgeRef.current = { kind: 'miss' };
          } else if (mode === 'wait') {
            popupAt(ev.midi, 'Certo!', COLORS.hit);
          } else {
            const offsetMs = ev.offsetMs ?? 0;
            popupAt(ev.midi, timingLabel(ev.result, offsetMs, true), GRADE_COLORS[ev.result]);
            lastJudgeRef.current = { kind: ev.result, offsetMs };
          }
          break;
        case 'wrong':
          popupAt(ev.midi, '✗', COLORS.miss);
          if (ev.instead !== undefined) {
            popupAt(ev.instead, 'Errou', COLORS.miss);
            lastJudgeRef.current = { kind: 'wrong' };
          }
          break;
        case 'loop':
          setLoopInfo((prev) => ({ passes: (prev?.passes ?? 0) + 1, lastScore: ev.lastScore }));
          break;
        case 'finished':
          finish();
          break;
      }
    }
  };

  const handleRef = useRef(handleEvents);
  handleRef.current = handleEvents;

  const stopLoop = () => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  };

  const silence = () => {
    const engine = engineRef.current;
    if (engine) handleEvents(engine.stopSound());
    midi.allNotesOff();
    sound.allOff();
  };

  const runLoop = () => {
    stopLoop();
    const step = () => {
      const engine = engineRef.current;
      if (!engine || phaseRef.current !== 'playing') return;
      handleRef.current(engine.tick(performance.now()));
      if (engine.version !== lastVersion.current) {
        lastVersion.current = engine.version;
        bump();
      }
      if (phaseRef.current === 'playing') frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  };

  const makeEngine = () => {
    silence();
    const loop = loopOn ? { startBar: Math.min(loopFrom, loopTo), endBar: Math.max(loopFrom, loopTo) } : null;
    engineRef.current = new PracticeEngine(song, { mode, hands, tempo, loop, metronome, countInBars: 1 });
    popupsRef.current = [];
    lastJudgeRef.current = null;
    setLoopInfo(null);
    setResult(null);
    lastVersion.current = -1;
    bump();
  };

  const finish = () => {
    const engine = engineRef.current;
    if (!engine) return;
    stopLoop();
    silence();
    if (engine.opts.mode === 'listen') {
      makeEngine();
      setPhaseBoth('ready');
      return;
    }
    const score = scoreOf(engine.stats);
    const stars = starsFor(score);
    const counted = !engine.opts.loop && (engine.opts.hands === 'both' || !twoHands);
    const prevBest = stateRef.current.lessons[song.id]?.bestScore ?? 0;
    if (counted) {
      const next = recordResult(stateRef.current, song.id, score, stars);
      save(next);
      setState(next);
    }
    setResult({
      score,
      stars,
      stats: { ...engine.stats },
      timing: [...engine.timing],
      counted,
      newBest: counted && score > prevBest,
    });
    setPhaseBoth('done');
  };

  const start = () => {
    sound.unlock();
    if (!engineRef.current || phaseRef.current === 'done') makeEngine();
    setPhaseBoth('playing');
    runLoop();
  };

  const pause = () => {
    if (phaseRef.current !== 'playing') return;
    stopLoop();
    engineRef.current?.pauseClock();
    silence();
    setPhaseBoth('paused');
  };

  const restart = () => {
    sound.unlock();
    makeEngine();
    setPhaseBoth('playing');
    runLoop();
  };

  // Options that change the notes to play rebuild the session.
  useEffect(() => {
    stopLoop();
    makeEngine();
    setPhaseBoth('ready');
    // Switching to or from the Roland's metronome changes how the music starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, mode, hands, loopOn, loopFrom, loopTo, roland]);

  useEffect(() => engineRef.current?.setTempo(tempo), [tempo]);
  useEffect(() => engineRef.current?.setMetronome(metronome), [metronome]);

  const chooseMode = (m: Mode) => {
    setMode(m);
    if (m !== 'listen') updateSettings({ mode: m });
  };
  const chooseMetronome = (m: MetronomeSource) => {
    setMetronome(m);
    updateSettings({ metronome: m });
  };

  // Keys from the Fantom, the computer keyboard or the mouse.
  const onKeyRef = useRef<(e: KeyEvent) => void>(() => {});
  onKeyRef.current = (e: KeyEvent) => {
      if (e.source !== 'midi') {
        if (e.type === 'down') sound.noteOn(e.midi, e.velocity);
        else sound.noteOff(e.midi);
      }
      const pressed = pressedRef.current;
      if (e.type === 'up') {
        pressed.delete(e.midi);
        bump();
        return;
      }
      if (e.midi < RANGE.low || e.midi > RANGE.high) {
        setNotice('Essa nota está fora das 61 teclas. Confira se o Octave Shift / Transpose do Fantom está desligado.');
      }
      const engine = engineRef.current;
      let keyState: KeyState = 'down';
      if (engine && phaseRef.current === 'playing') {
        const events = engine.keyDown(e.midi, e.at);
        handleEvents(events);
        if (events.some((x) => x.type === 'judged' && x.result !== 'miss')) keyState = 'ok';
        if (events.some((x) => x.type === 'wrong')) keyState = 'wrong';
      }
      pressed.set(e.midi, keyState);
      bump();
  };
  useEffect(() => midi.onKey((e) => onKeyRef.current(e)), []);

  // Space = start/pause, Esc = pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (phaseRef.current === 'playing') pause();
        else if (phaseRef.current !== 'done') start();
      } else if (e.code === 'Escape') pause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hands, bpm, metronome, loopOn, loopFrom, loopTo]);

  useEffect(
    () => () => {
      stopLoop();
      silence();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // --- What the keyboard shows.
  const engine = engineRef.current;
  const keyStates = new Map<number, KeyState>();
  const fingers = new Map<number, number>();
  if (engine) {
    engine.soundingKeys().forEach((m) => keyStates.set(m, 'accomp'));
    for (const n of engine.expectedNotes()) {
      keyStates.set(n.midi, 'expected');
      if (n.finger) fingers.set(n.midi, n.finger);
    }
  }
  pressedRef.current.forEach((st, m) => keyStates.set(m, st));

  const stats = engine?.stats;
  const done = stats ? stats.perfect + stats.good + stats.off : 0;
  // In performance mode a wrong key either took a note's place or was one key too many.
  const errors = stats ? (mode === 'wait' ? stats.wrong : stats.wrong + stats.extra) : 0;
  const currentBar = engine ? Math.max(1, Math.min(bars, Math.floor(engine.pos / song.beatsPerBar) + 1)) : 1;
  const expectedList = engine ? engine.expectedNotes() : [];
  const bothHandsNow = new Set(expectedList.map((n) => n.hand)).size > 1;
  const expectedNames = expectedList
    .map((n) => noteLabel(n.midi, settings.nameStyle, flats) + (bothHandsNow ? (n.hand === 'L' ? ' (esq.)' : ' (dir.)') : ''))
    .join(' + ');
  let banner: string | null = null;
  if (engine && phase === 'playing' && expectedNames) {
    if (engine.syncing) banner = `Toque ${expectedNames} junto com um clique do Roland`;
    else if (engine.waiting && mode === 'wait') banner = `Toque: ${expectedNames}`;
  }
  const output = midi.activeOutput();
  // In "both", the sheet takes the top part of the stage and the falling notes the rest.
  const sheetHeight =
    view === 'sheet' ? stage.height : view === 'both' ? Math.round(Math.min(stage.height * 0.55, 330)) : 0;

  return (
    <div className="player">
      <header className="player-top">
        <button className="ghost" onClick={onExit}>
          ← Trilha
        </button>
        <div className="player-title">
          <h1>{song.title}</h1>
          <span className="muted">
            Compasso {currentBar} de {bars} · {tempoLabel(song, bpm)}
          </span>
        </div>
        <Segmented<ViewMode>
          label="Visual"
          value={view}
          onChange={(v) => {
            setView(v);
            updateSettings({ view: v });
          }}
          options={[
            { value: 'falling', label: 'Notas caindo' },
            { value: 'sheet', label: 'Partitura' },
            { value: 'both', label: 'Ambos' },
          ]}
        />
        <div className="hud">
          {mode !== 'listen' && stats && (
            <>
              <span className="hud-item">
                <b>{done}</b>/{stats.total} notas
              </span>
              <span className="hud-item wrong">
                <b>{errors}</b> {errors === 1 ? 'errada' : 'erradas'}
              </span>
              {mode === 'perform' && (
                <span className="hud-item missed">
                  <b>{stats.missed}</b> {stats.missed === 1 ? 'perdida' : 'perdidas'}
                </span>
              )}
            </>
          )}
          {mode === 'perform' && engine && <TimingMeter timing={engine.timing} last={lastJudgeRef.current} />}
          {loopInfo && (
            <span className="hud-item">
              Volta {loopInfo.passes + 1} · anterior {loopInfo.lastScore}%
            </span>
          )}
        </div>
      </header>

      <div className="player-controls">
        <Segmented<Mode>
          label="Modo"
          value={mode}
          onChange={chooseMode}
          options={[
            {
              value: 'perform',
              label: 'Apresentação',
              hint: 'A música segue no tempo, mesmo se você errar: o erro fica marcado e você continua',
            },
            { value: 'wait', label: 'Espera', hint: 'A música para em cada nota até você acertar' },
            { value: 'listen', label: 'Ouvir', hint: 'O app toca a lição para você ouvir' },
          ]}
        />
        {twoHands && mode !== 'listen' && (
          <Segmented<HandsChoice>
            label="Mãos"
            value={hands}
            onChange={setHands}
            options={[
              { value: 'both', label: 'As duas' },
              { value: 'R', label: 'Direita' },
              { value: 'L', label: 'Esquerda' },
            ]}
          />
        )}
        <div className="control">
          <span className="control-label">
            Andamento {bpm === baseBpm ? '(original)' : `(${Math.round(tempo * 100)}% do original, ${baseBpm})`}
          </span>
          <div className="tempo">
            <button className="small" onClick={() => setBpm((b) => Math.max(minBpm, b - 1))} aria-label="1 bpm mais lento">
              −
            </button>
            <input
              type="range"
              min={minBpm}
              max={maxBpm}
              step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              aria-label="Andamento"
            />
            <button className="small" onClick={() => setBpm((b) => Math.min(maxBpm, b + 1))} aria-label="1 bpm mais rápido">
              +
            </button>
            <b className="tempo-value">{bpm} bpm</b>
          </div>
        </div>
        <Segmented<MetronomeSource> label="Metrônomo" value={metronome} onChange={chooseMetronome} options={METRONOME_OPTIONS} />
        <div className="control loop">
          <label className="check">
            <input type="checkbox" checked={loopOn} onChange={(e) => setLoopOn(e.target.checked)} />
            Repetir compassos
          </label>
          <input
            type="number"
            min={1}
            max={bars}
            value={loopFrom}
            disabled={!loopOn}
            onChange={(e) => setLoopFrom(Math.max(1, Math.min(bars, Number(e.target.value) || 1)))}
            aria-label="Do compasso"
          />
          <span>a</span>
          <input
            type="number"
            min={1}
            max={bars}
            value={loopTo}
            disabled={!loopOn}
            onChange={(e) => setLoopTo(Math.max(1, Math.min(bars, Number(e.target.value) || 1)))}
            aria-label="Até o compasso"
          />
        </div>
        <div className="actions">
          {phase === 'playing' && <button onClick={pause}>Pausar</button>}
          {phase === 'paused' && (
            <button className="primary" onClick={start}>
              Continuar
            </button>
          )}
          <button className="ghost" onClick={restart}>
            Reiniciar
          </button>
        </div>
      </div>

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button className="ghost small" onClick={() => setNotice(null)}>
            OK
          </button>
        </div>
      )}

      <div className="stage" ref={stageRef}>
        {view !== 'falling' && (
          <div className="stage-sheet" style={{ height: sheetHeight }}>
            <SheetMusic
              song={song}
              engineRef={engineRef}
              width={stage.width}
              height={sheetHeight}
              nameStyle={settings.nameStyle}
              showNames={settings.showNamesOnSheet}
            />
            <label className="sheet-names check">
              <input
                type="checkbox"
                checked={settings.showNamesOnSheet}
                onChange={(e) => updateSettings({ showNamesOnSheet: e.target.checked })}
              />
              Nomes nas notas
            </label>
          </div>
        )}
        {view !== 'sheet' && (
          <div className="stage-falling" style={{ top: sheetHeight, height: stage.height - sheetHeight }}>
            <FallingNotes
              engineRef={engineRef}
              popupsRef={popupsRef}
              rects={rects}
              width={stage.width}
              height={stage.height - sheetHeight}
              nameStyle={settings.nameStyle}
              flats={flats}
            />
          </div>
        )}
        {banner && <div className="waiting">{banner}</div>}

        {phase === 'ready' && (
          <div className="overlay">
            <div className="card intro">
              <h2>{song.title}</h2>
              <p>{song.goal}</p>
              <div className="metro-box">
                <div className="metro-bpm">
                  <span className="muted small">Metrônomo</span>
                  <b>{bpm} bpm</b>
                  <span className="muted small">
                    compasso {timeNum}/{timeDen}
                  </span>
                </div>
                <p className="small">{metronomeHelp(metronome, mode, bpm)}</p>
              </div>
              {view !== 'sheet' && (
                <ul className="legend">
                  {hasHand(song, 'R') && (
                    <li>
                      <i style={{ background: COLORS.right }} /> mão direita
                    </li>
                  )}
                  {hasHand(song, 'L') && (
                    <li>
                      <i style={{ background: COLORS.left }} /> mão esquerda
                    </li>
                  )}
                  <li>
                    <i style={{ background: COLORS.auto, border: '1px solid #aab' }} /> o app toca
                  </li>
                </ul>
              )}
              <ul className="legend">
                {view !== 'falling' && (
                  <>
                    <li>
                      <i style={{ background: '#2563eb' }} /> próxima nota
                    </li>
                    <li>
                      <i style={{ background: '#16a34a' }} /> acertou
                    </li>
                    <li>
                      <i style={{ background: '#dc2626' }} /> perdeu
                    </li>
                  </>
                )}
                <li>
                  <i style={{ background: COLORS.wait }} /> tecla que você deve tocar
                </li>
              </ul>
              <p className="muted small">
                {mode === 'wait' &&
                  (view === 'sheet'
                    ? 'Modo Espera: o cursor para em cada nota até você tocar a tecla certa.'
                    : 'Modo Espera: as notas param na linha até você tocar a tecla certa.')}
                {mode === 'perform' &&
                  (view === 'sheet'
                    ? 'Modo Apresentação: o cursor não para. Toque cada nota quando ele passar por ela. Se errar, o erro fica marcado e você segue para as próximas.'
                    : 'Modo Apresentação: a música não para. Toque cada nota quando ela encostar na linha. Se errar, o erro fica marcado e você segue para as próximas.')}
                {mode === 'listen' && 'Modo Ouvir: escute a lição antes de tocar.'}{' '}
                Acompanhamento: {output ? output.name : 'som do computador'}.
              </p>
              <button className="primary big" onClick={start}>
                {mode === 'listen' ? 'Ouvir' : 'Começar'}
              </button>
              <p className="muted small">Atalho: barra de espaço começa e pausa.</p>
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="overlay">
            <div className="card result">
              <Stars count={result.stars} size={34} />
              <div className="score">{result.score}%</div>
              {result.newBest && <div className="badge">Novo recorde!</div>}
              <p>{resultMessage(result.score)}</p>
              <dl className="result-stats">
                <div>
                  <dt>{mode === 'wait' ? 'Acertos' : 'No tempo'}</dt>
                  <dd>{result.stats.perfect}</dd>
                </div>
                {mode === 'perform' && (
                  <>
                    <div>
                      <dt>Um pouco fora</dt>
                      <dd>{result.stats.good}</dd>
                    </div>
                    <div>
                      <dt>Fora do tempo</dt>
                      <dd>{result.stats.off}</dd>
                    </div>
                    <div>
                      <dt>Notas erradas</dt>
                      <dd>{result.stats.wrong}</dd>
                    </div>
                    <div>
                      <dt>Perdidas</dt>
                      <dd>{result.stats.missed}</dd>
                    </div>
                    {result.stats.extra > 0 && (
                      <div>
                        <dt>Teclas a mais</dt>
                        <dd>{result.stats.extra}</dd>
                      </div>
                    )}
                  </>
                )}
                {mode === 'wait' && (
                  <div>
                    <dt>Teclas erradas</dt>
                    <dd>{result.stats.wrong}</dd>
                  </div>
                )}
              </dl>
              {mode === 'perform' && timingSummary(result.timing) && (
                <p className="small timing-summary">{timingSummary(result.timing)}</p>
              )}
              {!result.counted && (
                <p className="muted small">
                  Treino de mão separada ou de trecho não conta na trilha. Toque a lição inteira com as duas mãos
                  para registrar.
                </p>
              )}
              <div className="result-actions">
                <button className="primary" onClick={restart}>
                  Tocar de novo
                </button>
                {nextLessonId && (
                  <button onClick={() => onOpenLesson(nextLessonId)}>Próxima lição →</button>
                )}
                <button className="ghost" onClick={onExit}>
                  Voltar à trilha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Keyboard
        range={RANGE}
        width={stage.width}
        height={KEYBOARD_HEIGHT}
        states={keyStates}
        fingers={fingers}
        nameStyle={settings.nameStyle}
        showNames={settings.showNamesOnKeys}
        onPress={(m) => {
          sound.unlock();
          midi.emitKey({ type: 'down', midi: m, velocity: 90, source: 'computer', at: performance.now() });
        }}
        onRelease={(m) => midi.emitKey({ type: 'up', midi: m, velocity: 0, source: 'computer', at: performance.now() })}
      />
    </div>
  );
}

const GRADE_COLORS: Record<Grade, string> = { perfect: COLORS.hit, good: COLORS.wait, off: COLORS.left };

function metronomeHelp(metronome: MetronomeSource, mode: Mode, bpm: number): string {
  if (mode === 'listen') return `O app toca a lição a ${bpm} bpm.`;
  if (metronome === 'keyboard') {
    if (mode === 'wait') return 'No modo Espera a música para em cada nota: o metrônomo do Roland não é necessário.';
    return `No Roland, ajuste o andamento para ${bpm} e ligue o metrônomo: o clique sai no seu fone. As notas param na primeira: toque-a junto com um clique e a música segue no tempo do Roland.`;
  }
  if (metronome === 'app') return 'O app faz o clique no som do computador. Para ouvir no fone do Roland, escolha Metrônomo: Do Roland.';
  return 'Sem clique durante a música, só a contagem antes de começar.';
}

/** One line on the player's timing tendency, once there are enough notes to tell. */
function timingSummary(timing: number[]): string | null {
  if (timing.length < 4) return null;
  const mean = timing.reduce((a, b) => a + b, 0) / timing.length;
  const spread = timing.reduce((a, b) => a + Math.abs(b - mean), 0) / timing.length;
  const ms = Math.round(Math.abs(mean));
  const trend = ms <= 15 ? 'Na média você tocou no tempo' : `Na média você tocou ${ms} ms ${mean < 0 ? 'adiantado' : 'atrasado'}`;
  return `${trend}; de uma nota para outra, a diferença típica foi de ${Math.round(spread)} ms.`;
}

function resultMessage(score: number): string {
  if (score >= 95) return 'Excelente! Lição dominada.';
  if (score >= 80) return 'Muito bom! Mais uma vez e chega nas 3 estrelas.';
  if (score >= 60) return 'Passou! Repita para ganhar mais estrelas ou siga para outra lição.';
  return 'Quase lá. Tente no modo Espera ou diminua a velocidade.';
}
