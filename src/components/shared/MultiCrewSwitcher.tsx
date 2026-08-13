'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TierGateGuard } from '@/components/tier/TierGateGuard';
import { useTier } from '@/hooks/useTier';
import { cn, tierColor, tierLabel } from '@/lib/utils';
import type { CrewSummary } from '@/types';

interface MultiCrewSwitcherProps {
  crews: CrewSummary[];
  activeCrewId: string | null;
  onSelect: (crewId: string) => void;
}

/**
 * Captain+ dropdown in the shell header for switching between the crews the
 * signed-in user belongs to.
 *
 * Controlled by the dashboard layout, which owns the crew list (loaded via
 * `get_web_account_profile`) and the active crew. Selection routes through
 * the layout's `switchCrew()` so CrewProvider context, tier state, and the
 * redirect to /fleet all stay in sync.
 */
export function MultiCrewSwitcher({ crews, activeCrewId, onSelect }: MultiCrewSwitcherProps) {
  const { settings, isLoading } = useTier();
  const [open, setOpen] = useState(false);

  // No choice to make — hide entirely.
  if (crews.length < 2) return null;
  // TierGateGuard renders a content-scale skeleton while useTier() loads;
  // skip it inside the 56px shell header.
  if (isLoading) return null;

  const currentId = activeCrewId ?? settings?.crewId ?? null;
  const activeCrew = crews.find((c) => c.crew_id === currentId) ?? crews[0];

  return (
    <TierGateGuard minTier="captain" fallback={null}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-8 items-center gap-1.5 rounded-full border border-outline bg-surface px-3 text-sm font-medium text-on-surface transition-colors hover:opacity-90 dark:border-zinc-700"
        >
          <span className="max-w-[120px] truncate">{activeCrew?.crew_name}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-on-surface-variant transition-transform', open && 'rotate-180')}
          />
        </button>

        {open && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              role="listbox"
              aria-label="Crews"
              className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-outline bg-surface p-2 shadow-sm dark:border-zinc-700"
            >
              {crews.map((crew) => {
                const selected = crew.crew_id === currentId;
                return (
                  <button
                    key={crew.crew_id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(crew.crew_id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-container-high',
                      selected && 'bg-[color-mix(in_srgb,var(--brand-seed)_10%,transparent)]'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-on-surface">{crew.crew_name}</span>
                      <span className="block truncate text-xs capitalize text-on-surface-variant">{crew.role}</span>
                    </span>
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: tierColor(crew.tier), color: '#fff' }}
                    >
                      {tierLabel(crew.tier)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </TierGateGuard>
  );
}
