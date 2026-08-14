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
  const [palette] = useState<BrandPalette>(FALLBACK);

  useEffect(() => {
    applyPalette(FALLBACK);
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
