import { useEffect, useState } from 'react';
import { installComputerKeyboard } from './midi/computerKeyboard';
import { midi } from './midi/midiConnection';
import { findLesson } from './music/lessons';
import { loadLibrary, saveLibrary, type LibrarySong } from './store/library';
import { load, type SavedState } from './store/progress';
import { Home } from './ui/Home';
import { LessonPlayer } from './ui/LessonPlayer';

// Screens live in the address hash so the browser back button works: #/licao/<id>
function lessonFromHash(): string | null {
  const m = /^#\/licao\/(.+)$/.exec(window.location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

export function App() {
  const [state, setState] = useState<SavedState>(load);
  const [lessonId, setLessonId] = useState<string | null>(lessonFromHash);
  const [library, setLibrary] = useState<LibrarySong[]>(loadLibrary);

  const changeLibrary = (list: LibrarySong[]) => {
    if (!saveLibrary(list)) return false;
    setLibrary(list);
    return true;
  };

  useEffect(() => installComputerKeyboard(), []);

  useEffect(() => {
    const onHash = () => setLessonId(lessonFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // If Chrome already allowed MIDI on a previous visit, connect without asking.
  useEffect(() => {
    if (!midi.supported || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'midi' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') void midi.connect();
      })
      .catch(() => {});
  }, []);

  const open = (id: string) => {
    window.location.hash = `#/licao/${encodeURIComponent(id)}`;
  };
  const home = () => {
    window.location.hash = '';
  };

  const imported = lessonId ? library.find((s) => s.id === lessonId) : undefined;
  if (imported) {
    return (
      <LessonPlayer
        key={imported.id}
        song={imported}
        nextLessonId={null}
        state={state}
        setState={setState}
        onExit={home}
        onOpenLesson={open}
      />
    );
  }

  const found = lessonId ? findLesson(lessonId) : null;
  if (found) {
    const next = found.module.lessons[found.index + 1]?.id ?? null;
    return (
      <LessonPlayer
        key={found.song.id}
        song={found.song}
        nextLessonId={next}
        state={state}
        setState={setState}
        onExit={home}
        onOpenLesson={open}
      />
    );
  }
  return (
    <Home state={state} setState={setState} onOpenLesson={open} library={library} onLibraryChange={changeLibrary} />
  );
}
