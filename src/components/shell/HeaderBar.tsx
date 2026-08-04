'use client';
import { useCrew } from '@/hooks/useCrew';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ChevronDown } from 'lucide-react';

export function HeaderBar({ title }: { title: string }) {
  const { crewName, tier, crews, setCrew } = useCrew();

  return (
    <header className="flex items-center justify-between px-lg py-sm border-b border-outline-variant bg-transparent min-h-[48px]">
      <div className="flex items-center gap-3">
        <h1 className="font-heading font-extrabold text-lg text-on-surface">{title}</h1>
        {crews.length > 1 && (
          <div className="relative group">
            <button className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface bg-surface-container rounded-lg px-2 py-1 border border-outline-variant">
              <span>{crewName}</span>
              <span className="text-2xs px-1.5 py-0.5 rounded bg-primary-container text-primary font-semibold">{tier}</span>
              <ChevronDown size={12} />
            </button>
            <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-30 bg-surface border border-outline rounded-lg shadow-lg py-1 min-w-[180px]">
              {crews.map(c => (
                <button key={c.crew_id} onClick={() => setCrew(c)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container text-on-surface">
                  {c.crew_name}
                  <span className="text-2xs text-on-surface-variant ml-2">{c.tier} · {c.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
          {/* User initials — replace with actual data from account profile */}
          U
        </div>
      </div>
    </header>
  );
}
