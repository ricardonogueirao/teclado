import { useMemo } from 'react';
import { MIDDLE_C, letter, solfege, type KeyRange, type NameStyle } from '../music/notes';
import { keyLayout } from './keyboardLayout';

/** How a key is drawn. Order matters: a pressed state wins over a hint. */
export type KeyState = 'ok' | 'wrong' | 'down' | 'expected' | 'accomp';

interface Props {
  range: KeyRange;
  width: number;
  height: number;
  states: Map<number, KeyState>;
  fingers?: Map<number, number>;
  nameStyle: NameStyle;
  showNames: boolean;
  onPress: (midi: number) => void;
  onRelease: (midi: number) => void;
}

export function Keyboard({ range, width, height, states, fingers, nameStyle, showNames, onPress, onRelease }: Props) {
  const rects = useMemo(() => keyLayout(range, width), [range, width]);
  if (width === 0) return <div className="keyboard" style={{ height }} />;

  const keys = [...rects.values()];
  const whites = keys.filter((k) => !k.black);
  const blacks = keys.filter((k) => k.black);

  const press = (midi: number) => (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    onPress(midi);
  };
  const release = (midi: number) => () => onRelease(midi);
  const handlers = (midi: number) => ({
    onPointerDown: press(midi),
    onPointerUp: release(midi),
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.buttons) onRelease(midi);
    },
  });

  return (
    <div className="keyboard" style={{ height }} role="group" aria-label="Teclado">
      {whites.map((k) => {
        const state = states.get(k.midi);
        const finger = state === 'expected' ? fingers?.get(k.midi) : undefined;
        return (
          <div
            key={k.midi}
            className={`key white ${state ?? ''}`}
            style={{ left: k.x, width: k.w }}
            data-midi={k.midi}
            {...handlers(k.midi)}
          >
            {finger !== undefined && <span className="finger">{finger}</span>}
            {k.midi === MIDDLE_C && <span className="middle-c" title="Dó central" />}
            {showNames && (
              <span className="key-name">
                {nameStyle !== 'letters' && <span>{solfege(k.midi)}</span>}
                {nameStyle !== 'solfege' && <span className="key-letter">{letter(k.midi)}</span>}
              </span>
            )}
          </div>
        );
      })}
      {blacks.map((k) => {
        const state = states.get(k.midi);
        const finger = state === 'expected' ? fingers?.get(k.midi) : undefined;
        return (
          <div
            key={k.midi}
            className={`key black ${state ?? ''}`}
            style={{ left: k.x, width: k.w }}
            data-midi={k.midi}
            {...handlers(k.midi)}
          >
            {finger !== undefined && <span className="finger">{finger}</span>}
          </div>
        );
      })}
    </div>
  );
}
