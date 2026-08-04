'use client';
import { useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';

const ICON_MAP: Record<string, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

function iconFor(resolved: string) {
  if (resolved === 'dark') return <Moon size={18} />;
  return <Sun size={18} />;
}

function labelFor(t: Theme) {
  return ({ system: 'System', light: 'Light', dark: 'Dark' })[t];
}

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-full
                   text-on-surface-variant hover:bg-primary-container transition-colors"
        aria-label="Toggle theme"
      >
        {iconFor(resolved)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-outline
                          rounded-lg shadow-lg py-1 min-w-[120px]">
            {(['system', 'light', 'dark'] as Theme[]).map(t => {
              const Icon = ICON_MAP[t];
              return (
                <button
                  key={t}
                  onClick={() => { setTheme(t); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2
                    ${t === theme ? 'text-primary bg-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
                >
                  <Icon size={18} />
                  {labelFor(t)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
