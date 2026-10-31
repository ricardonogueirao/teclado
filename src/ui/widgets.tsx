interface Option<T> {
  value: T;
  label: string;
  hint?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="control">
      <span className="control-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'on' : ''}
            title={o.hint}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stars({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${count} de 3 estrelas`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}
