'use client';

/**
 * Branding stub — production fetches a per-crew brand palette from
 * crew_branding (Admiral tier only) and applies it as CSS variables.
 * The redesign has no branding backend yet: return the default palette
 * (matching the crewradr design tokens) and apply the same CSS variables
 * the ported UI reads (--brand-seed, --brand-accent, --brand-sand,
 * --primary) so the auth/dashboard shell renders with our tokens.
 */
interface BrandPalette {
  seed: string;
  accent: string;
  sandAccent: string;
  surfaceTint: string;
}

// Matches tokens.css --color-primary (light) / --color-secondary (dark sand).
const FALLBACK: BrandPalette = {
  seed: '#8EA595',
  accent: '#6E8679',
  sandAccent: '#DDCFB5',
  surfaceTint: '#F5F4F0',
};

// Apply immediately so there's no flash before React mounts.
if (typeof document !== 'undefined') {
  applyPalette(FALLBACK);
}

export function useBranding(_crewId?: string | null, _userTier?: number) {
  // Stub: branding is static. The palette is applied at module scope, so
  // the ported UI reads the right tokens on first paint and after theme
  // changes (inline CSS vars are theme-independent).
  return FALLBACK;
}

function applyPalette(p: BrandPalette) {
  const root = document.documentElement;
  root.style.setProperty('--brand-seed', p.seed);
  root.style.setProperty('--brand-accent', p.accent);
  root.style.setProperty('--brand-sand', p.sandAccent);
  // --brand-surface is intentionally NOT set inline — the CSS :root /
  // [data-theme="dark"] rules in globals.css control it so the theme
  // toggle works correctly.
  root.style.setProperty('--primary', p.seed);
}
