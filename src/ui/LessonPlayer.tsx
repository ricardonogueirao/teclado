import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import {
  PracticeEngine,
  scoreOf,
  starsFor,
  type EngineEvent,
  type HandsChoice,
  type Mode,
  type Stats,
} from '../engine/practice';
import { midi, type KeyEvent } from '../midi/midiConnection';
import { FANTOM_6_RANGE, noteLabel } from '../music/notes';
import { hasHand, songLengthBeats, type Song } from '../music/types';
import { isUnlocked, recordResult, save, type SavedState } from '../store/progress';
import { COLORS, FallingNotes, type Popup } from './FallingNotes';
import { Keyboard, type KeyState } from './Keyboard';
import { keyLayout } from './keyboardLayout';
import { Segmented, Stars } from './widgets';
import { useSize } from './useSize';

type Phase = 'ready' | 'playing' | 'paused' | 'done';

interface Result {
  score: number;
  stars: number;
  stats: Stats;
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
  const bars = songLengthBeats(song) / song.beatsPerBar;
  const settings = state.settings;

  const [mode, setMode] = useState<Mode>('wait');
  const [hands, setHands] = useState<HandsChoice>('both');
  const [tempo, setTempo] = useState(1);
  const [metronome, setMetronome] = useState(settings.metronome);
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
  const pressedRef = useRef(new Map<number, KeyState>());
  const phaseRef = useRef<Phase>('ready');
  const frameRef = useRef(0);
  const lastVersion = useRef(-1);
  const stateRef = useRef(state);
  stateRef.current = state;

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
          sound.click(ev.downbeat);
          break;
        case 'accOn':
          accOn(ev.midi);
          break;
        case 'accOff':
          accOff(ev.midi);
          break;
        case 'judged':
          if (ev.result === 'perfect') popupAt(ev.midi, mode === 'wait' ? 'Certo!' : 'Perfeito!', COLORS.hit);
          else if (ev.result === 'good')
            popupAt(ev.midi, (ev.offsetMs ?? 0) < 0 ? 'Adiantado' : 'Atrasado', COLORS.left);
          else popupAt(ev.midi, 'Perdeu', COLORS.miss);
          break;
        case 'wrong':
          popupAt(ev.midi, '✗', COLORS.miss);
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
    setResult({ score, stars, stats: { ...engine.stats }, counted, newBest: counted && score > prevBest });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, mode, hands, loopOn, loopFrom, loopTo]);

  useEffect(() => engineRef.current?.setTempo(tempo), [tempo]);
  useEffect(() => engineRef.current?.setMetronome(metronome), [metronome]);

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
  }, [mode, hands, tempo, metronome, loopOn, loopFrom, loopTo]);

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
  const done = stats ? stats.perfect + stats.good : 0;
  const currentBar = engine ? Math.max(1, Math.min(bars, Math.floor(engine.pos / song.beatsPerBar) + 1)) : 1;
  const waitingFor =
    engine && engine.waiting && mode === 'wait'
      ? engine.expectedKeys().map((m) => noteLabel(m, settings.nameStyle)).join(' + ')
      : null;
  const output = midi.activeOutput();
  const unlockedNext = nextLessonId ? isUnlocked(state, nextLessonId) : false;

  return (
    <div className="player">
      <header className="player-top">
        <button className="ghost" onClick={onExit}>
          ← Trilha
        </button>
        <div className="player-title">
          <h1>{song.title}</h1>
          <span className="muted">
            Compasso {currentBar} de {bars} · {Math.round(song.bpm * tempo)} bpm
          </span>
        </div>
        <div className="hud">
          {mode !== 'listen' && stats && (
            <>
              <span className="hud-item">
                <b>{done}</b>/{stats.total} notas
              </span>
              <span className="hud-item wrong">
                <b>{stats.wrong}</b> {stats.wrong === 1 ? 'errada' : 'erradas'}
              </span>
              {mode === 'perform' && (
                <span className="hud-item missed">
                  <b>{stats.missed}</b> {stats.missed === 1 ? 'perdida' : 'perdidas'}
                </span>
              )}
            </>
          )}
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
          onChange={setMode}
          options={[
            { value: 'wait', label: 'Espera', hint: 'A música para e espera você acertar' },
            { value: 'perform', label: 'Apresentação', hint: 'A música segue no tempo e você recebe nota' },
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
        <label className="control">
          <span className="control-label">Velocidade {Math.round(tempo * 100)}%</span>
          <input
            type="range"
            min={40}
            max={120}
            step={5}
            value={Math.round(tempo * 100)}
            onChange={(e) => setTempo(Number(e.target.value) / 100)}
          />
        </label>
        <label className="control check">
          <input type="checkbox" checked={metronome} onChange={(e) => setMetronome(e.target.checked)} />
          Metrônomo
        </label>
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
        <FallingNotes
          engineRef={engineRef}
          popupsRef={popupsRef}
          rects={rects}
          width={stage.width}
          height={stage.height}
          nameStyle={settings.nameStyle}
        />
        {waitingFor && <div className="waiting">Toque: {waitingFor}</div>}

        {phase === 'ready' && (
          <div className="overlay">
            <div className="card intro">
              <h2>{song.title}</h2>
              <p>{song.goal}</p>
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
                <li>
                  <i style={{ background: COLORS.wait }} /> tecla que você deve tocar
                </li>
              </ul>
              <p className="muted small">
                {mode === 'wait' && 'Modo Espera: as notas param na linha até você tocar a tecla certa.'}
                {mode === 'perform' && 'Modo Apresentação: a música não para. Toque cada nota quando ela encostar na linha.'}
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
              <p>{resultMessage(result.score, result.counted && !!nextLessonId)}</p>
              <dl className="result-stats">
                <div>
                  <dt>{mode === 'wait' ? 'Acertos' : 'Perfeitas'}</dt>
                  <dd>{result.stats.perfect}</dd>
                </div>
                {mode === 'perform' && (
                  <>
                    <div>
                      <dt>Fora do tempo</dt>
                      <dd>{result.stats.good}</dd>
                    </div>
                    <div>
                      <dt>Perdidas</dt>
                      <dd>{result.stats.missed}</dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>Teclas erradas</dt>
                  <dd>{result.stats.wrong}</dd>
                </div>
              </dl>
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
                {nextLessonId && unlockedNext && (
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

function resultMessage(score: number, unlocksNext: boolean): string {
  if (score >= 95) return 'Excelente! Lição dominada.';
  if (score >= 80) return 'Muito bom! Mais uma vez e chega nas 3 estrelas.';
  if (score >= 60) return unlocksNext ? 'Passou! A próxima lição foi liberada.' : 'Passou!';
  return 'Quase lá. Tente no modo Espera ou diminua a velocidade.';
}
