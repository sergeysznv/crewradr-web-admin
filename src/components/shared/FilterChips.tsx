// src/components/shared/FilterChips.tsx
import { cn } from '@/lib/utils';

interface Option<V extends string | number> {
  value: V;
  label: string;
}

export function FilterChips<V extends string | number = string>({
  options,
  selected,
  onSelect,
}: {
  options: Option<V>[];
  selected: V | undefined;
  onSelect: (value: V) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              isSelected
                ? 'bg-primary text-on-primary'
                : 'border border-outline text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
