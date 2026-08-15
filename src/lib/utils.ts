import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function tierRank(tier: string): number {
  switch (tier) {
    case 'admiral': return 3;
    case 'captain': return 2;
    case 'first_mate': return 1;
    default: return 0;
  }
}

export function tierLabel(
  tier: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  switch (tier) {
    case 'admiral': return t('webTierAdmiral');
    case 'captain': return t('webTierCaptain');
    case 'first_mate': return t('webTierFirstMate');
    default: return t('webTierDeckhand');
  }
}

export function tierColor(tier: string): string {
  switch (tier) {
    case 'admiral': return '#7B2FBE';
    case 'captain': return '#D4A017';
    case 'first_mate': return '#4A90D9';
    default: return '#6B7280';
  }
}

export function colorToHex(c: number): string {
  return '#' + (c >>> 0).toString(16).slice(2).toUpperCase();
}

export function hexToColor(hex: string): number {
  const cleaned = hex.replace('#', '');
  return parseInt('FF' + cleaned, 16);
}

export function formatDate(
  ts: string | null | undefined,
  locale?: string,
): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function formatRelativeTime(
  ts: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('webTimeJustNow');
  if (mins < 60) return t('webTimeMinAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('webTimeHourAgo', { n: hours });
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
