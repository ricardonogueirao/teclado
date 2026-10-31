import { useRef, useState } from 'react';
import { ACCEPTED } from '../import/importFile';
import { songLengthBeats, tempoLabel } from '../music/types';
import type { LibrarySong } from '../store/library';
import type { SavedState } from '../store/progress';
import { ImportDialog } from './ImportDialog';
import { Stars } from './widgets';

interface Props {
  library: LibrarySong[];
  state: SavedState;
  /** Saves the new list; false if the browser refused. */
  onChange: (list: LibrarySong[]) => boolean;
  onOpen: (id: string) => void;
}

export function Library({ library, state, onChange, onOpen }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const remove = (song: LibrarySong) => {
    if (window.confirm(`Apagar "${song.title}" da sua biblioteca?`)) onChange(library.filter((s) => s.id !== song.id));
  };

  return (
    <section
      className={`library ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) setFile(f);
      }}
    >
      <div className="section-head">
        <h2>Minhas músicas</h2>
        <button className="primary" onClick={() => inputRef.current?.click()}>
          Importar música
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {library.length === 0 ? (
        <div className="library-empty muted">
          <p>
            Importe arranjos para piano em <b>MusicXML</b> (.mxl, .musicxml) ou <b>MIDI</b> (.mid). Você também pode
            arrastar o arquivo para cá.
          </p>
          <p className="small">
            Onde conseguir: no <b>MuseScore.com</b>, procure a música com "piano" e o nível (por exemplo "easy
            piano"), abra a partitura, clique em <b>Baixar</b> e escolha <b>MusicXML</b>. Prefira MusicXML: a partitura
            sai igual à original. Do MIDI só vêm as notas.
          </p>
        </div>
      ) : (
        <ol className="lessons">
          {library.map((song) => {
            const progress = state.lessons[song.id];
            const bars = Math.round(songLengthBeats(song) / song.beatsPerBar);
            return (
              <li key={song.id} className="song-item">
                <button className="lesson-row" onClick={() => onOpen(song.id)}>
                  <span className="lesson-title">
                    {song.title}
                    <span className="muted small song-meta">
                      {bars} compassos · {tempoLabel(song)}
                    </span>
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
                <button className="ghost small remove" onClick={() => remove(song)} aria-label={`Apagar ${song.title}`} title="Apagar">
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {file && (
        <ImportDialog
          file={file}
          onCancel={() => setFile(null)}
          onSave={(song) => {
            if (!onChange([song, ...library])) return false;
            setFile(null);
            onOpen(song.id);
            return true;
          }}
        />
      )}
    </section>
  );
}
