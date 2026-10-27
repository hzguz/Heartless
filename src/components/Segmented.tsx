export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex items-center gap-0.5 rounded-[8px] border border-subtle p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'flex-1 rounded-[6px] px-2 py-1 text-[11.5px] transition-colors ' +
              (active
                ? 'bg-surface text-text-primary'
                : 'text-muted hover:text-text-primary')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
