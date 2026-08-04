export function FilterChips<T extends string>({ options, selected, onSelect }: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onSelect(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border
            ${selected === opt.value
              ? 'bg-primary-container text-primary border-primary/30'
              : 'bg-surface text-on-surface-variant border-outline hover:bg-surface-container'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
