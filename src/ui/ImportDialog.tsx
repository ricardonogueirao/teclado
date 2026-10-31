import { useEffect, useMemo, useState } from 'react';
import { importFile } from '../import/importFile';
import { buildImportedSong, countOutside, suggestOctaveShift, suggestRoles } from '../import/toSong';
import type { ImportedScore, ImportedTrack, TrackRole } from '../import/types';
import { octave, solfege } from '../music/notes';
import { newSongId, type LibrarySong } from '../store/library';

interface Props {
  file: File;
  onCancel: () => void;
  onSave: (song: LibrarySong) => boolean;
}

const ROLE_LABEL: Record<TrackRole, string> = {
  R: 'Mão direita',
  L: 'Mão esquerda',
  A: 'O app toca',
  off: 'Não usar',
};

function range(track: ImportedTrack, flats: boolean): string {
  const midis = track.notes.map((n) => n.midi);
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  return `${solfege(lo, flats)}${octave(lo)} – ${solfege(hi, flats)}${octave(hi)}`;
}

function keyText(fifths: number): string {
  if (fifths === 0) return 'sem sustenidos nem bemóis';
  const n = Math.abs(fifths);
  return fifths > 0 ? `${n} ${n === 1 ? 'sustenido' : 'sustenidos'}` : `${n} ${n === 1 ? 'bemol' : 'bemóis'}`;
}

export function ImportDialog({ file, onCancel, onSave }: Props) {
  const [score, setScore] = useState<ImportedScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(100);
  const [roles, setRoles] = useState<Record<string, TrackRole>>({});
  const [shift, setShift] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    importFile(file)
      .then((s) => {
        if (!alive) return;
        const r = suggestRoles(s);
        setScore(s);
        setTitle(s.title);
        setBpm(s.bpm);
        setRoles(r);
        setShift(suggestOctaveShift(s, r));
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Não consegui ler o arquivo.'));
    return () => {
      alive = false;
    };
  }, [file]);

  const counts = useMemo(() => {
    const c: Record<TrackRole, number> = { R: 0, L: 0, A: 0, off: 0 };
    score?.tracks.forEach((t) => (c[roles[t.id] ?? 'off'] += t.notes.length));
    return c;
  }, [score, roles]);
  const outside = score ? countOutside(score, roles, shift) : 0;
  const canSave = counts.R + counts.L > 0 && title.trim().length > 0;

  const setRole = (id: string, role: TrackRole) => {
    const next = { ...roles, [id]: role };
    setRoles(next);
    if (score) setShift(suggestOctaveShift(score, next));
  };

  const save = () => {
    if (!score) return;
    const song = buildImportedSong(score, { title, bpm, roles, octaveShift: shift }, newSongId(), file.name);
    const entry: LibrarySong = { ...song, fileName: file.name, importedAt: new Date().toISOString() };
    if (!onSave(entry)) setSaveError('O Chrome não tem mais espaço para guardar músicas. Apague alguma da sua biblioteca e tente de novo.');
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Importar música">
      <div className="card import">
        <h2>Importar música</h2>
        <p className="muted small">{file.name}</p>

        {!score && !error && <p>Lendo o arquivo…</p>}
        {error && (
          <>
            <p className="error">{error}</p>
            <div className="result-actions">
              <button onClick={onCancel}>Fechar</button>
            </div>
          </>
        )}

        {score && (
          <>
            <div className="import-grid">
              <label className="control grow">
                <span className="control-label">Título</span>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="control">
                <span className="control-label">Andamento (bpm)</span>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value) || 100)}
                />
              </label>
            </div>
            <p className="muted small">
              Compasso {score.timeSig[0]}/{score.timeSig[1]} · armadura: {keyText(score.keyFifths)}
              {score.format === 'midi' && ' · arquivo MIDI: a partitura é montada a partir das notas, pode sair simplificada'}
            </p>

            <table className="tracks">
              <thead>
                <tr>
                  <th>Parte</th>
                  <th>Notas</th>
                  <th>Extensão</th>
                  <th>Quem toca</th>
                </tr>
              </thead>
              <tbody>
                {score.tracks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.notes.length}</td>
                    <td className="muted">{range(t, score.keyFifths < 0)}</td>
                    <td>
                      {t.drums ? (
                        <span className="muted small">bateria (não usada)</span>
                      ) : (
                        <select
                          value={roles[t.id] ?? 'off'}
                          onChange={(e) => setRole(t.id, e.target.value as TrackRole)}
                          aria-label={`Quem toca ${t.name}`}
                        >
                          {(['R', 'L', 'A', 'off'] as TrackRole[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="import-grid">
              <label className="control">
                <span className="control-label">Oitava das suas mãos</span>
                <select value={shift} onChange={(e) => setShift(Number(e.target.value))}>
                  {[-2, -1, 0, 1, 2].map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? 'Original' : s > 0 ? `${s} acima` : `${-s} abaixo`}
                    </option>
                  ))}
                </select>
              </label>
              <p className={`small ${outside ? 'warn-text' : 'muted'}`}>
                {outside
                  ? `${outside} ${outside === 1 ? 'nota fica' : 'notas ficam'} fora das 61 teclas e ${outside === 1 ? 'será trazida' : 'serão trazidas'} para dentro, mudando de oitava.`
                  : 'Todas as suas notas cabem nas 61 teclas do Fantom 6.'}
              </p>
            </div>

            <p className="small">
              Você toca: <b>{counts.R}</b> notas na mão direita e <b>{counts.L}</b> na esquerda.
              {counts.A > 0 && (
                <>
                  {' '}
                  O app toca <b>{counts.A}</b> notas de acompanhamento.
                </>
              )}
            </p>
            {!canSave && <p className="warn-text small">Escolha pelo menos uma parte para a mão direita ou a esquerda.</p>}
            {saveError && <p className="error">{saveError}</p>}

            <div className="result-actions">
              <button className="primary" disabled={!canSave} onClick={save}>
                Salvar e abrir
              </button>
              <button className="ghost" onClick={onCancel}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
