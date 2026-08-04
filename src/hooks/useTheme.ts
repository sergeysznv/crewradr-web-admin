'use client';
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

function resolveTheme(t: Theme): ResolvedTheme {
  if (t !== 'system') return t;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('crewradr-theme') as Theme | null;
    // Intentional post-mount hydration: a lazy initializer would read
    // localStorage during first client render and diverge from SSR HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored ?? 'system');
  }, []);

  const resolved: ResolvedTheme = resolveTheme(theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('crewradr-theme', theme);
  }, [theme, resolved]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') setThemeState('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const resolved = resolveTheme(prev);
      if (prev === 'system') return resolved === 'dark' ? 'light' : 'dark';
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return { theme, resolved, setTheme, toggleTheme };
}
