'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getCrewSettings } from '@/lib/rpc';

interface BrandPalette {
  seed: string;
  accent: string;
  sandAccent: string;
  surfaceTint: string;
  logoUrl: string | null;
}

const FALLBACK: BrandPalette = {
  seed: '#8EA595',
  accent: '#6E8679',
  sandAccent: '#DDCFB5',
  surfaceTint: '#F5F4F0', // matches landing page --cream
  logoUrl: null,
};

// Apply fallback immediately so there's no flash before React mounts.
if (typeof document !== 'undefined') {
  applyPalette(FALLBACK);
}

/** Returns true if the given tier string represents Admiral tier. */
function isAdmiral(tier: string): boolean {
  return tier === 'admiral';
}

/** Normalizes a seed_color value (ARGB bigint or hex string) to #RRGGBB. */
export function normalizeSeedColor(c: string | number | null | undefined): string | null {
  if (c == null) return null;
  if (typeof c === 'number') return intToHex(c);
  const s = c.trim();
  if (s.startsWith('#')) return s;
  const n = Number(s);
  return Number.isFinite(n) ? intToHex(n) : null;
}

export function useBranding(crewId?: string | null, userTier?: number) {
  const [palette, setPalette] = useState<BrandPalette>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const cacheKey = crewId ? `crewradr-branding-${crewId}` : 'crewradr-branding';

    async function init() {
      // 1. Load cached branding from localStorage for instant display
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const p = JSON.parse(cached) as BrandPalette;
          if (!cancelled) setPalette(p);
          applyPalette(p);
        }
      } catch { /* ignore */ }

      // Only fetch custom branding if user is Admiral tier (rank 3)
      const tier = userTier ?? await getCrewTier();
      if (tier >= 3) {
        const id = crewId ?? await getCrewId();
        if (id && !cancelled) {
          try {
            // 2. Fetch branding via get_web_crew_settings (seed + logo).
            const settings = await getCrewSettings(supabase, id);
            const seed = normalizeSeedColor(settings?.branding?.seed_color);
            const logoUrl = settings?.branding?.logo_url ?? null;
            if (seed) {
              const p: BrandPalette = {
                seed,
                accent: FALLBACK.accent,
                sandAccent: FALLBACK.sandAccent,
                surfaceTint: FALLBACK.surfaceTint,
                logoUrl,
              };
              if (!cancelled) { setPalette(p); applyPalette(p); }
              localStorage.setItem(cacheKey, JSON.stringify(p));
            }
          } catch { /* fall back to cache/fallback */ }

          // 3. Subscribe to Realtime filtered by this specific crew_id.
          channel = supabase
            .channel(`crew_branding:${id}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'crew_branding', filter: `crew_id=eq.${id}` },
              (payload) => {
                const record = payload.new as Record<string, unknown> | null;
                if (!record || Object.keys(record).length === 0) {
                  setPalette(FALLBACK);
                  applyPalette(FALLBACK);
                  return;
                }
                const seed = normalizeSeedColor(record.seed_color as string | number | null | undefined);
                const p: BrandPalette = seed
                  ? { seed, accent: FALLBACK.accent, sandAccent: FALLBACK.sandAccent, surfaceTint: FALLBACK.surfaceTint, logoUrl: (record.logo_url as string | null) ?? null }
                  : FALLBACK;
                setPalette(p);
                applyPalette(p);
                localStorage.setItem(cacheKey, JSON.stringify(p));
                // Branding changed — reload to pick up new palette.
                setTimeout(() => window.location.reload(), 300);
              }
            )
            .subscribe();
        }
      } else {
        // Not Admiral — ensure fallback is applied
        applyPalette(FALLBACK);
        setPalette(FALLBACK);
      }
    }

    init();

    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [crewId, userTier]);

  return palette;
}

async function getCrewId(): Promise<string | null> {
  try {
    const { data } = await supabase.rpc('get_web_account_profile');
    return data?.crews?.[0]?.crew_id ?? null;
  } catch {
    return null;
  }
}

async function getCrewTier(): Promise<number> {
  try {
    const { data } = await supabase.rpc('get_web_account_profile');
    const tier = (data?.crews?.[0]?.tier as string) ?? 'deckhand';
    return tier === 'admiral' ? 3 : tier === 'captain' ? 2 : tier === 'first_mate' ? 1 : 0;
  } catch {
    return 0;
  }
}

function intToHex(c: number): string {
  if (!c) return FALLBACK.seed;
  return '#' + (c >>> 0).toString(16).slice(2).toUpperCase();
}

function applyPalette(p: BrandPalette) {
  const root = document.documentElement;
  root.style.setProperty('--brand-seed', p.seed);
  root.style.setProperty('--brand-accent', p.accent);
  root.style.setProperty('--brand-sand', p.sandAccent);
  root.style.setProperty('--brand-surface-tint', p.surfaceTint);
  // --brand-surface is intentionally NOT set inline — the CSS :root / .dark
  // rules in globals.css control it so dark-mode toggle works correctly.
  root.style.setProperty('--primary', p.seed);
}
