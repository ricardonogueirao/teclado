import { useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import type { MetronomeSource } from '../engine/practice';
import { AUTO, NO_OUTPUT, midi as connection, type KeyEvent } from '../midi/midiConnection';
import { MODULES, UPCOMING_MODULES } from '../music/lessons';
import { FANTOM_6_RANGE, noteLabelWithOctave, type NameStyle } from '../music/notes';
import { tempoLabel } from '../music/types';
import { canInstall, install, onInstallChange } from '../pwa';
import { save, streak, type SavedState, type Settings } from '../store/progress';
import type { LibrarySong } from '../store/library';
import { Keyboard, type KeyState } from './Keyboard';
import { Library } from './Library';
import { useMidi } from './useMidi';
import { useSize } from './useSize';
import { METRONOME_OPTIONS, Segmented, Stars } from './widgets';

interface Props {
  state: SavedState;
  setState: (s: SavedState) => void;
  onOpenLesson: (id: string) => void;
  library: LibrarySong[];
  onLibraryChange: (list: LibrarySong[]) => boolean;
}

export function Home({ state, setState, onOpenLesson, library, onLibraryChange }: Props) {
  const [installable, setInstallable] = useState(canInstall);
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);
  const days = streak(state.practiceDays);
  const lessonIds = MODULES.flatMap((m) => m.lessons.map((l) => l.id));
  const totalStars = lessonIds.reduce((n, id) => n + (state.lessons[id]?.stars ?? 0), 0);
  const maxStars = MODULES.reduce((n, m) => n + m.lessons.length * 3, 0);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...state, settings: { ...state.settings, ...patch } };
    save(next);
    setState(next);
  };

  return (
    <div className="home">
      <header className="home-top">
        <div className="brand">
          <span className="logo" aria-hidden>
            <i />
            <i />
            <i className="lit" />
            <i />
          </span>
          Tecla a Tecla
        </div>
        <div className="home-stats">
          {installable && (
            <button className="primary small" onClick={() => void install()} title="Abre como um app próprio, com ícone no Dock, e funciona sem internet">
              Instalar no Mac
            </button>
          )}
          <span>
            <b>{days}</b> {days === 1 ? 'dia seguido' : 'dias seguidos'}
          </span>
          <span>
            <b>{totalStars}</b>/{maxStars} estrelas
          </span>
        </div>
      </header>

      <ConnectionPanel nameStyle={state.settings.nameStyle} />

      <Library library={library} state={state} onChange={onLibraryChange} onOpen={onOpenLesson} />

      <section className="path">
        <h2>Sua trilha</h2>
        {MODULES.map((module) => (
          <div key={module.id} className="module">
            <div className="module-head">
              <h3>{module.title}</h3>
              <p className="muted">{module.description}</p>
            </div>
            <ol className="lessons">
              {module.lessons.map((lesson, i) => {
                const progress = state.lessons[lesson.id];
                return (
                  <li key={lesson.id}>
                    <button className="lesson-row" onClick={() => onOpenLesson(lesson.id)}>
                      <span className={`lesson-num ${progress && progress.stars > 0 ? 'done' : ''}`}>{i + 1}</span>
                      <span className="lesson-title">{lesson.title}</span>
                      <span className="lesson-bpm" title="Andamento para o metrônomo">
                        {tempoLabel(lesson)}
                      </span>
                      {progress ? (
                        <>
                          <Stars count={progress.stars} />
                          <span className="lesson-score">{progress.bestScore}%</span>
                        </>
                      ) : (
                        <span className="muted small">Nova</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
        {UPCOMING_MODULES.map((m) => (
          <div key={m.title} className="module upcoming">
            <div className="module-head">
              <h3>{m.title}</h3>
              <p className="muted">{m.description}</p>
            </div>
            <span className="soon">Em breve</span>
          </div>
        ))}
      </section>

      <section className="settings">
        <h2>Configurações</h2>
        <div className="settings-grid">
          <Segmented<NameStyle>
            label="Nome das notas"
            value={state.settings.nameStyle}
            onChange={(nameStyle) => updateSettings({ nameStyle })}
            options={[
              { value: 'both', label: 'Dó · C' },
              { value: 'solfege', label: 'Dó Ré Mi' },
              { value: 'letters', label: 'C D E' },
            ]}
          />
          <label className="control check">
            <input
              type="checkbox"
              checked={state.settings.showNamesOnKeys}
              onChange={(e) => updateSettings({ showNamesOnKeys: e.target.checked })}
            />
            Mostrar nomes nas teclas
          </label>
          <Segmented<MetronomeSource>
            label="Metrônomo nas lições"
            value={state.settings.metronome}
            onChange={(metronome) => updateSettings({ metronome })}
            options={METRONOME_OPTIONS}
          />
        </div>
        <PortSettings />
      </section>
    </div>
  );
}

function ConnectionPanel({ nameStyle }: { nameStyle: NameStyle }) {
  const midi = useMidi();
  const [ref, size] = useSize<HTMLDivElement>();
  const pressed = useRef(new Map<number, KeyState>());
  const [last, setLast] = useState<KeyEvent | null>(null);
  const [, bump] = useState(0);

  useEffect(
    () =>
      connection.onKey((e) => {
        if (e.source !== 'midi') {
          if (e.type === 'down') sound.noteOn(e.midi, e.velocity);
          else sound.noteOff(e.midi);
        }
        if (e.type === 'down') {
          pressed.current.set(e.midi, 'down');
          setLast(e);
        } else pressed.current.delete(e.midi);
        bump((v) => v + 1);
      }),
    [],
  );

  const inputs = midi.activeInputs();
  const lastRaw = midi.log.find((l) => l.event.type === 'noteOn');
  let status: { tone: 'ok' | 'warn' | 'idle'; title: string; text: string };
  switch (midi.status) {
    case 'unsupported':
      status = {
        tone: 'warn',
        title: 'Este navegador não lê teclados MIDI',
        text: 'Abra este endereço no Google Chrome. O Safari não tem suporte.',
      };
      break;
    case 'denied':
      status = {
        tone: 'warn',
        title: 'O Chrome bloqueou o acesso ao teclado',
        text: 'Clique no ícone à esquerda do endereço, em "Dispositivos MIDI" escolha Permitir e recarregue a página.',
      };
      break;
    case 'connecting':
      status = { tone: 'idle', title: 'Aguardando permissão', text: 'Clique em "Permitir" no aviso do Chrome.' };
      break;
    case 'ready':
      status = inputs.length
        ? {
            tone: 'ok',
            title: `Conectado: ${inputs.map((p) => p.name).join(', ')}`,
            text: 'Toque qualquer tecla do Fantom: ela acende no teclado abaixo.',
          }
        : {
            tone: 'warn',
            title: 'Nenhum teclado encontrado',
            text: 'Confira se o Fantom está ligado e o cabo USB está na porta USB COMPUTER. Ele aparece aqui sozinho quando conectar.',
          };
      break;
    default:
      status = {
        tone: 'idle',
        title: 'Conecte seu teclado',
        text: 'Ligue o Fantom no Mac pelo cabo USB (porta USB COMPUTER) e clique em Conectar. O Chrome vai pedir permissão para acessar dispositivos MIDI.',
      };
  }

  return (
    <section className={`connection ${status.tone}`}>
      <div className="connection-head">
        <span className={`dot ${status.tone}`} aria-hidden />
        <div>
          <h2>{status.title}</h2>
          <p className="muted">{status.text}</p>
        </div>
        {(midi.status === 'idle' || midi.status === 'denied') && (
          <button className="primary" onClick={() => void midi.connect()}>
            Conectar teclado
          </button>
        )}
      </div>
      <div className="test-area">
        <div className="last-note">
          {last ? (
            <>
              <span className="big-note">{noteLabelWithOctave(last.midi)}</span>
              <span className="muted small">
                {last.source === 'midi'
                  ? `força ${last.velocity}${lastRaw ? ` · canal ${lastRaw.event.channel}` : ''}`
                  : 'tocado no computador'}
              </span>
            </>
          ) : (
            <span className="muted">
              Sem teclado? Use as teclas <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>G</kbd> <kbd>H</kbd>{' '}
              <kbd>J</kbd> <kbd>K</kbd> do computador (brancas) e <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd>{' '}
              <kbd>U</kbd> (pretas). <kbd>Z</kbd> e <kbd>X</kbd> mudam a oitava.
            </span>
          )}
        </div>
        <div ref={ref} className="test-keyboard">
          <Keyboard
            range={FANTOM_6_RANGE}
            width={size.width}
            height={96}
            states={pressed.current}
            nameStyle={nameStyle}
            showNames={false}
            onPress={(m) => {
              sound.unlock();
              connection.emitKey({ type: 'down', midi: m, velocity: 90, source: 'computer', at: performance.now() });
            }}
            onRelease={(m) =>
              connection.emitKey({ type: 'up', midi: m, velocity: 0, source: 'computer', at: performance.now() })
            }
          />
        </div>
      </div>
    </section>
  );
}

function PortSettings() {
  const midi = useMidi();
  const activeOut = midi.activeOutput();
  const log = useMemo(() => midi.log, [midi.log]);
  if (midi.status !== 'ready') return null;
  return (
    <>
      <div className="settings-grid">
        <label className="control">
          <span className="control-label">Entrada (de onde vêm as teclas)</span>
          <select value={midi.inputChoice} onChange={(e) => midi.setInput(e.target.value)}>
            <option value={AUTO}>Automático</option>
            {midi.inputs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="control-label">Acompanhamento toca em</span>
          <select value={midi.outputChoice} onChange={(e) => midi.setOutput(e.target.value)}>
            <option value={AUTO}>Automático ({activeOut ? activeOut.name : 'som do computador'})</option>
            <option value={NO_OUTPUT}>Som do computador</option>
            {midi.outputs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="diagnostics">
        <summary>Diagnóstico MIDI</summary>
        <p className="muted small">Últimas mensagens recebidas. Útil se uma tecla não for reconhecida.</p>
        <table>
          <thead>
            <tr>
              <th>Porta</th>
              <th>Tipo</th>
              <th>Nota</th>
              <th>Canal</th>
              <th>Força</th>
            </tr>
          </thead>
          <tbody>
            {log.map((l, i) => (
              <tr key={i}>
                <td>{l.port}</td>
                <td>{l.event.type === 'noteOn' ? 'tecla ↓' : l.event.type === 'noteOff' ? 'tecla ↑' : 'pedal'}</td>
                <td>{'midi' in l.event ? `${noteLabelWithOctave(l.event.midi)} · ${l.event.midi}` : l.event.on ? 'ligado' : 'solto'}</td>
                <td>{l.event.channel}</td>
                <td>{l.event.type === 'noteOn' ? l.event.velocity : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
